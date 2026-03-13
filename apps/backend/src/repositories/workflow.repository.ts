import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { restaurantWorkflows } from "@menugo/data/schemas";

class WorkflowRepository {
  async findByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(restaurantWorkflows)
      .where(eq(restaurantWorkflows.restaurantId, restaurantId))
      .orderBy(restaurantWorkflows.displayOrder);
  }

  async findActiveByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(restaurantWorkflows)
      .where(
        and(
          eq(restaurantWorkflows.restaurantId, restaurantId),
          eq(restaurantWorkflows.isActive, true),
        ),
      )
      .orderBy(restaurantWorkflows.displayOrder);
  }

  async findTransition(
    restaurantId: number,
    fromState: string,
    toState: string,
  ) {
    const typedFrom = fromState as "received" | "preparing" | "ready" | "served" | "paid" | "cancelled";
    const typedTo = toState as "received" | "preparing" | "ready" | "served" | "paid" | "cancelled";
    const [transition] = await db
      .select()
      .from(restaurantWorkflows)
      .where(
        and(
          eq(restaurantWorkflows.restaurantId, restaurantId),
          eq(restaurantWorkflows.fromState, typedFrom),
          eq(restaurantWorkflows.toState, typedTo),
          eq(restaurantWorkflows.isActive, true),
        ),
      );
    return transition || null;
  }

  async seedDefaults(restaurantId: number) {
    const defaults = [
      { fromState: "received" as const, toState: "preparing" as const, requiredPermission: "order_prepare", displayOrder: 1 },
      { fromState: "preparing" as const, toState: "ready" as const, requiredPermission: "order_prepare", displayOrder: 2 },
      { fromState: "ready" as const, toState: "served" as const, requiredPermission: "order_deliver", displayOrder: 3 },
      { fromState: "served" as const, toState: "paid" as const, requiredPermission: "close_sessions", displayOrder: 4 },
      { fromState: "received" as const, toState: "cancelled" as const, requiredPermission: "modify_order", displayOrder: 5 },
      { fromState: "preparing" as const, toState: "cancelled" as const, requiredPermission: "modify_order", displayOrder: 6 },
      { fromState: "ready" as const, toState: "cancelled" as const, requiredPermission: "modify_order", displayOrder: 7 },
    ];

    const rows = defaults.map((d) => ({
      restaurantId,
      fromState: d.fromState,
      toState: d.toState,
      requiredPermission: d.requiredPermission,
      displayOrder: d.displayOrder,
    }));

    return db
      .insert(restaurantWorkflows)
      .values(rows)
      .onConflictDoNothing()
      .returning();
  }

  /**
   * Build and persist workflow transitions based on which roles exist.
   *
   * Logic:
   * - Has kitchen role → full flow: received → preparing → ready → served → paid
   * - No kitchen role  → skip kitchen steps: received → served → paid
   * - Has cashier role  → served → paid requires close_sessions
   * - No cashier role   → served → paid requires order_deliver (waiter closes)
   *
   * Cancellation transitions are added for every non-terminal state.
   */
  async rebuildForRoles(
    restaurantId: number,
    roleNames: string[],
  ) {
    const has = (name: string) =>
      roleNames.some((r) => r.toLowerCase() === name.toLowerCase());

    const hasKitchen = has("kitchen");
    const hasCashier = has("cashier");

    const transitions: Array<{
      fromState: string;
      toState: string;
      requiredPermission: string;
      displayOrder: number;
    }> = [];

    let order = 1;

    if (hasKitchen) {
      // Full flow with kitchen
      transitions.push(
        { fromState: "received", toState: "preparing", requiredPermission: "order_prepare", displayOrder: order++ },
        { fromState: "preparing", toState: "ready", requiredPermission: "order_prepare", displayOrder: order++ },
        { fromState: "ready", toState: "served", requiredPermission: "order_deliver", displayOrder: order++ },
      );
    } else {
      // No kitchen — waiter receives and marks served directly
      transitions.push(
        { fromState: "received", toState: "served", requiredPermission: "order_deliver", displayOrder: order++ },
      );
    }

    // Payment step
    transitions.push({
      fromState: "served",
      toState: "paid",
      requiredPermission: hasCashier ? "close_sessions" : "order_deliver",
      displayOrder: order++,
    });

    // Cancellation from every non-terminal state in the flow
    const nonTerminal = new Set(transitions.map((t) => t.fromState));
    for (const state of nonTerminal) {
      transitions.push({
        fromState: state,
        toState: "cancelled",
        requiredPermission: "modify_order",
        displayOrder: order++,
      });
    }

    return this.replaceAll(
      restaurantId,
      transitions.map((t) => ({ ...t, isActive: true })),
    );
  }

  async replaceAll(
    restaurantId: number,
    transitions: Array<{
      fromState: string;
      toState: string;
      requiredPermission?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    }>,
  ) {
    // Delete all existing transitions for this restaurant
    await db
      .delete(restaurantWorkflows)
      .where(eq(restaurantWorkflows.restaurantId, restaurantId));

    if (transitions.length === 0) return [];

    const rows = transitions.map((t, idx) => ({
      restaurantId,
      fromState: t.fromState as "received" | "preparing" | "ready" | "served" | "paid" | "cancelled",
      toState: t.toState as "received" | "preparing" | "ready" | "served" | "paid" | "cancelled",
      requiredPermission: t.requiredPermission ?? null,
      displayOrder: t.displayOrder ?? idx + 1,
      isActive: t.isActive ?? true,
    }));

    return db.insert(restaurantWorkflows).values(rows).returning();
  }

  /**
   * Returns the `toState` values of all active workflow transitions that are
   * flagged as customer-notify steps (i.e. `isCustomerNotifyStep = true`).
   *
   * Used by the notification orchestrator to replace the old
   * `triggerEvent.endsWith("_to_ready")` heuristic.
   */
  async findCustomerNotifyToStates(restaurantId: number): Promise<string[]> {
    const rows = await db
      .select({ toState: restaurantWorkflows.toState })
      .from(restaurantWorkflows)
      .where(
        and(
          eq(restaurantWorkflows.restaurantId, restaurantId),
          eq(restaurantWorkflows.isActive, true),
          eq(restaurantWorkflows.isCustomerNotifyStep, true),
        ),
      );
    return rows.map((r) => r.toState);
  }
}

export const workflowRepository = new WorkflowRepository();
