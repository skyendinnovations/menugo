import { workflowRepository } from "../repositories/workflow.repository";
import { notificationSettingsRepository } from "../repositories/notification-settings.repository";
import { auditService } from "./audit.service";
import { eventBus } from "./event-bus.service";
import { AppError } from "../types";
import type { AuditContext } from "../types";
import { restaurants, roles } from "@menugo/data/schemas";
import { db } from "@menugo/data";
import { eq } from "drizzle-orm";
import type { WorkflowTransitionInput } from "@menugo/dto";
import { isValidPermissionKey } from "@menugo/dto";
import { logger } from "../utils/logger";

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

/** Human-readable labels for order statuses. */
const STATUS_DISPLAY_LABELS: Record<string, string> = {
  received: "New Order",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  paid: "Completed",
  cancelled: "Cancelled",
};

/**
 * Derive entry/exit statuses for each step based on step count.
 * 1 step:  received → paid
 * 2 steps: received → served → paid
 * 3 steps: received → ready → served → paid
 * 4 steps: received → preparing → ready → served → paid
 */
function computeStepStatuses(
  count: number,
): Array<{ entry: string; exit: string }> {
  if (count <= 0) return [];
  if (count === 1) return [{ entry: "received", exit: "paid" }];
  if (count === 2)
    return [
      { entry: "received", exit: "served" },
      { entry: "served", exit: "paid" },
    ];
  if (count === 3)
    return [
      { entry: "received", exit: "ready" },
      { entry: "ready", exit: "served" },
      { entry: "served", exit: "paid" },
    ];
  return [
    { entry: "received", exit: "preparing" },
    { entry: "preparing", exit: "ready" },
    { entry: "ready", exit: "served" },
    { entry: "served", exit: "paid" },
  ].slice(0, Math.min(count, 4));
}

class WorkflowService {
  /**
   * Get all workflow transitions for a restaurant (including inactive).
   */
  async getWorkflows(restaurantId: number) {
    return workflowRepository.findByRestaurant(restaurantId);
  }

  /**
   * Validate that a status transition is allowed for a restaurant's
   * configured workflow.
   *
   * Per-transition permission requirements (e.g. `requiredPermission`) are
   * intentionally NOT re-checked here — the route middleware has already
   * enforced the caller's permissions before the service is invoked.
   * Doing so again would be redundant and would require a second DB round-trip
   * to resolve the actor's roles.
   *
   * Throws `AppError(400)` if the transition is not in the workflow.
   */
  async validateTransition(
    restaurantId: number,
    fromState: string,
    toState: string,
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
        return;
      }

      throw new AppError(
        400,
        `Cannot transition from '${fromState}' to '${toState}'`,
      );
    }
  }

  /**
   * Seed default workflow transitions for a newly created restaurant.
   */
  async seedDefaultWorkflows(restaurantId: number) {
    return workflowRepository.seedDefaults(restaurantId);
  }

  /**
   * Rebuild workflow transitions based on the roles that exist for a restaurant.
   */
  async rebuildForRoles(restaurantId: number, roleNames: string[]) {
    return workflowRepository.rebuildForRoles(restaurantId, roleNames);
  }

  /**
   * Compute the active order flow for a restaurant.
   * Returns the ordered list of visible statuses (for tabs) and
   * a transition map (current → next forward status).
   */
  async getOrderFlow(restaurantId: number): Promise<{
    statuses: string[];
    transitions: Record<string, string | null>;
  }> {
    const active = await workflowRepository.findActiveByRestaurant(restaurantId);

    if (active.length === 0) {
      // Legacy fallback
      return {
        statuses: ["received", "preparing", "ready", "served", "paid"],
        transitions: {
          received: "preparing",
          preparing: "ready",
          ready: "served",
          served: "paid",
          paid: null,
        },
      };
    }

    // Build the forward chain (exclude cancellation transitions)
    const forward = active.filter((t) => t.toState !== "cancelled");

    // Build a map of fromState → toState for the primary (forward) path
    const transMap: Record<string, string | null> = {};
    for (const t of forward) {
      // If multiple outgoing transitions from the same state, take the
      // first one by displayOrder (already sorted)
      if (!(t.fromState in transMap)) {
        transMap[t.fromState] = t.toState;
      }
    }

    // Walk the chain from "received" to build the ordered statuses
    const statuses: string[] = [];
    let current: string | null = "received";
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
      visited.add(current);
      statuses.push(current);
      current = transMap[current] ?? null;
    }

    // Ensure terminal state is included
    if (current && !visited.has(current)) {
      statuses.push(current);
    }

    // Mark terminal states (no outgoing transition)
    for (const s of statuses) {
      if (!(s in transMap)) {
        transMap[s] = null;
      }
    }

    return { statuses, transitions: transMap };
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

  // ─── Flow Config (visual editor) ───────────────────────────

  /**
   * Get the flow configuration for the visual editor.
   * Returns step details + available roles that can be added.
   */
  async getFlowConfig(restaurantId: number) {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));
    const settings = (restaurant?.workflowSettings || {}) as Record<
      string,
      unknown
    >;
    const allRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.restaurantId, restaurantId));

    let configuredSteps: Array<{
      roleId: number;
      showAcceptButton: boolean;
    }> = (settings.steps as any[]) || [];

    // Auto-derive from existing roles if no steps configured
    if (configuredSteps.length === 0) {
      const roleOrder = ["kitchen", "waiter", "cashier"];
      for (const name of roleOrder) {
        const role = allRoles.find(
          (r) => r.name.toLowerCase() === name,
        );
        if (role)
          configuredSteps.push({
            roleId: role.id,
            showAcceptButton: name === "waiter",
          });
      }
      // Fallback: use non-owner/manager roles
      if (configuredSteps.length === 0) {
        for (const role of allRoles) {
          if (
            role.name.toLowerCase() !== "owner" &&
            role.name.toLowerCase() !== "manager"
          )
            configuredSteps.push({
              roleId: role.id,
              showAcceptButton: false,
            });
        }
      }
    }

    // Remove steps for roles that no longer exist
    const roleIds = new Set(allRoles.map((r) => r.id));
    configuredSteps = configuredSteps.filter((s) => roleIds.has(s.roleId));

    const statuses = computeStepStatuses(configuredSteps.length);
    const roleMap = new Map(allRoles.map((r) => [r.id, r]));

    const steps = configuredSteps.map((step, i) => {
      const role = roleMap.get(step.roleId);
      const st = statuses[i] || { entry: "received", exit: "paid" };
      return {
        roleId: step.roleId,
        roleName: role?.name || "Unknown",
        showAcceptButton: step.showAcceptButton,
        entryStatus: st.entry,
        exitStatus: st.exit,
        entryStatusLabel:
          STATUS_DISPLAY_LABELS[st.entry] || st.entry,
        exitStatusLabel:
          STATUS_DISPLAY_LABELS[st.exit] || st.exit,
        triggerEvent:
          i === 0
            ? "order_placed"
            : `status_${statuses[i - 1]!.entry}_to_${statuses[i - 1]!.exit}`,
      };
    });

    const stepRoleIds = new Set(configuredSteps.map((s) => s.roleId));
    const availableRoles = allRoles
      .filter(
        (r) =>
          !stepRoleIds.has(r.id) &&
          r.name.toLowerCase() !== "owner" &&
          r.name.toLowerCase() !== "manager",
      )
      .map((r) => ({ id: r.id, name: r.name }));

    return { steps, availableRoles };
  }

  /**
   * Save the flow configuration from the visual editor.
   * Rebuilds transitions, notification settings, and persists steps.
   */
  async saveFlowConfig(
    restaurantId: number,
    steps: Array<{ roleId: number; showAcceptButton: boolean }>,
    ctx?: AuditContext,
  ) {
    // Validate
    const allRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.restaurantId, restaurantId));
    const roleMap = new Map(allRoles.map((r) => [r.id, r]));

    for (const step of steps) {
      if (!roleMap.has(step.roleId)) {
        throw new AppError(400, `Role ${step.roleId} not found`);
      }
    }
    if (steps.length > 4) {
      throw new AppError(400, "Maximum 4 steps in the order flow");
    }

    // Compute statuses
    const statuses = computeStepStatuses(steps.length);

    // Build transitions
    const transitions: Array<{
      fromState: string;
      toState: string;
      requiredPermission: string | null;
      displayOrder: number;
      isActive: boolean;
    }> = [];

    for (let i = 0; i < statuses.length; i++) {
      transitions.push({
        fromState: statuses[i]!.entry,
        toState: statuses[i]!.exit,
        requiredPermission: null,
        displayOrder: i + 1,
        isActive: true,
      });
    }

    // Cancellation transitions
    let order = transitions.length + 1;
    const nonTerminal = new Set(statuses.map((s) => s.entry));
    for (const state of nonTerminal) {
      transitions.push({
        fromState: state,
        toState: "cancelled",
        requiredPermission: "modify_order",
        displayOrder: order++,
        isActive: true,
      });
    }

    // Save transitions
    await workflowRepository.replaceAll(restaurantId, transitions);

    // Update workflowSettings
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));
    const currentSettings =
      ((restaurant?.workflowSettings || {}) as Record<string, unknown>);
    const newSettings = {
      ...currentSettings,
      steps: steps.map((s) => ({
        roleId: s.roleId,
        showAcceptButton: s.showAcceptButton,
      })),
      orderFlow: ["received", ...statuses.map((s) => s.exit)],
    };

    await db
      .update(restaurants)
      .set({ workflowSettings: newSettings, updatedAt: new Date() })
      .where(eq(restaurants.id, restaurantId));

    // Rebuild notification settings
    await notificationSettingsRepository.seedDefaults(restaurantId);

    // Audit
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "workflow_changed",
          entityType: "workflow",
          entityId: String(restaurantId),
          newValue: { steps },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit event
    eventBus.emit(restaurantId, "workflow_changed", {
      transitionCount: steps.length,
    });

    logger.info("Flow config saved", {
      restaurantId,
      steps: steps.length,
    });

    return this.getFlowConfig(restaurantId);
  }
}

export const workflowService = new WorkflowService();
