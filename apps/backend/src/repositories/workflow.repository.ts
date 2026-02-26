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
}

export const workflowRepository = new WorkflowRepository();
