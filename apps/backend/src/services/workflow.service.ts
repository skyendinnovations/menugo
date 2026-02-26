import { workflowRepository } from "../repositories/workflow.repository";
import { auditService } from "./audit.service";
import { eventBus } from "./event-bus.service";
import { AppError } from "../types";
import { db } from "@menugo/data";
import { userRoles, roles } from "@menugo/data/schemas";
import { eq, and } from "drizzle-orm";
import type { Permissions, PermissionKey, WorkflowTransitionInput } from "@menugo/dto";
import { isValidPermissionKey } from "@menugo/dto";
import { logger } from "../utils/logger";

/** Contextual info passed from the controller for audit logging. */
interface AuditContext {
  actorUserId: string;
  ipAddress?: string;
}

/**
 * Resolve merged permissions for a user in a restaurant.
 * Mirrors the logic in the permission middleware so the workflow service
 * can enforce per-transition permission requirements.
 */
async function getMergedPermissions(
  userId: string,
  restaurantId: number,
): Promise<{ permissions: Permissions; isOwner: boolean }> {
  const entries = await db
    .select({
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.restaurantId, restaurantId),
      ),
    );

  const isOwner = entries.some((r) => r.roleName === "owner");
  if (isOwner) return { permissions: {}, isOwner: true };

  const merged: Permissions = {};
  for (const entry of entries) {
    const perms = (entry.permissions || {}) as Permissions;
    for (const [key, value] of Object.entries(perms)) {
      if (value) {
        merged[key as PermissionKey] = true;
      }
    }
  }
  return { permissions: merged, isOwner: false };
}

/** Legacy hardcoded transitions — used as fallback for restaurants without seeded workflows. */
const DEFAULT_TRANSITIONS: Record<string, string[]> = {
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["paid"],
  paid: [],
  cancelled: [],
};

const ORDER_STATUSES = ["received", "preparing", "ready", "served", "paid", "cancelled"];
const TERMINAL_STATES = new Set(["paid", "cancelled"]);

class WorkflowService {
  /**
   * Get all workflow transitions for a restaurant (including inactive).
   */
  async getWorkflows(restaurantId: number) {
    return workflowRepository.findByRestaurant(restaurantId);
  }

  /**
   * Validate that a status transition is allowed for a restaurant.
   * When an actorUserId is provided, also checks that the actor has the
   * per-transition required permission.
   *
   * Throws AppError if the transition is disallowed.
   */
  async validateTransition(
    restaurantId: number,
    fromState: string,
    toState: string,
    actorUserId?: string,
  ): Promise<void> {
    const transition = await workflowRepository.findTransition(
      restaurantId,
      fromState,
      toState,
    );

    if (!transition) {
      // Check if the restaurant has any workflows configured at all
      const allTransitions =
        await workflowRepository.findActiveByRestaurant(restaurantId);

      if (allTransitions.length === 0) {
        // No workflows configured yet — fall back to legacy defaults
        const allowed = DEFAULT_TRANSITIONS[fromState];
        if (!allowed || !allowed.includes(toState)) {
          throw new AppError(
            400,
            `Cannot transition from '${fromState}' to '${toState}'`,
          );
        }
        return; // legacy path — no per-transition permission check
      }

      throw new AppError(
        400,
        `Cannot transition from '${fromState}' to '${toState}'`,
      );
    }

    // If the transition requires a specific permission, verify it
    if (transition.requiredPermission && actorUserId) {
      const { permissions, isOwner } = await getMergedPermissions(
        actorUserId,
        restaurantId,
      );
      if (
        !isOwner &&
        !permissions[transition.requiredPermission as PermissionKey]
      ) {
        throw new AppError(
          403,
          `You do not have the '${transition.requiredPermission}' permission required for this transition`,
        );
      }
    }
  }

  /**
   * Seed default workflow transitions for a newly created restaurant.
   */
  async seedDefaultWorkflows(restaurantId: number) {
    return workflowRepository.seedDefaults(restaurantId);
  }

  /**
   * Replace all workflow transitions for a restaurant (bulk update).
   * Validates inputs and checks for orphan states.
   */
  async updateWorkflows(
    restaurantId: number,
    transitions: WorkflowTransitionInput[],
    ctx?: AuditContext,
  ) {
    // ── Input validation ──────────────────────────────────────────
    for (const t of transitions) {
      if (!ORDER_STATUSES.includes(t.fromState)) {
        throw new AppError(400, `Invalid from_state: '${t.fromState}'`);
      }
      if (!ORDER_STATUSES.includes(t.toState)) {
        throw new AppError(400, `Invalid to_state: '${t.toState}'`);
      }
      if (t.fromState === t.toState) {
        throw new AppError(
          400,
          `from_state and to_state cannot be the same: '${t.fromState}'`,
        );
      }
      if (t.requiredPermission && !isValidPermissionKey(t.requiredPermission)) {
        throw new AppError(
          400,
          `Invalid permission key: '${t.requiredPermission}'`,
        );
      }
    }

    // ── Orphan state validation ───────────────────────────────────
    // Every non-terminal state that appears as a to_state must also
    // appear as a from_state with at least one outgoing transition.
    const activeTransitions = transitions.filter((t) => t.isActive !== false);
    const fromStates = new Set(activeTransitions.map((t) => t.fromState));
    const toStates = new Set(activeTransitions.map((t) => t.toState));

    for (const state of toStates) {
      if (!TERMINAL_STATES.has(state) && !fromStates.has(state)) {
        throw new AppError(
          400,
          `Orphan state detected: '${state}' is a target but has no outgoing transitions`,
        );
      }
    }

    // ── Persist ───────────────────────────────────────────────────
    const oldWorkflows =
      await workflowRepository.findByRestaurant(restaurantId);

    const result = await workflowRepository.replaceAll(
      restaurantId,
      transitions,
    );

    // ── Audit log ─────────────────────────────────────────────────
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "workflow_changed",
          entityType: "workflow",
          entityId: String(restaurantId),
          oldValue: oldWorkflows.map((w) => ({
            from: w.fromState,
            to: w.toState,
            perm: w.requiredPermission,
          })),
          newValue: transitions.map((t) => ({
            from: t.fromState,
            to: t.toState,
            perm: t.requiredPermission,
          })),
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // ── Real-time event ───────────────────────────────────────────
    eventBus.emit(restaurantId, "workflow_changed", {
      transitionCount: result.length,
    });

    logger.info("Workflow transitions updated", {
      restaurantId,
      count: result.length,
    });

    return result;
  }
}

export const workflowService = new WorkflowService();
