import { eq, and, sql, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@menugo/data";
import {
  orders,
  orderItems,
  tableSessions,
  restaurantTables,
  restaurantWorkflows,
  user as userTable,
} from "@menugo/data/schemas";

class OrderRepository {
  async findById(id: number) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || null;
  }

  async findWithItems(id: number) {
    const order = await this.findById(id);
    if (!order) return null;
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    return { ...order, items };
  }

  async findItemById(id: number) {
    const [item] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, id));
    return item || null;
  }

  async findItemsByOrder(orderId: number) {
    return db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async create(data: {
    restaurantId: number;
    tableSessionId: number;
    createdBy?: string;
    createdByDeviceId?: string;
    orderNumber: string;
    notes?: string;
    lastTriggerEvent?: string;
  }) {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async createItems(
    orderId: number,
    items: {
      menuItemId: number;
      itemName: string;
      variantName?: string;
      priceAtOrder: string;
      quantity: number;
      notes?: string;
    }[],
  ) {
    if (items.length === 0) return [];
    return db
      .insert(orderItems)
      .values(items.map((i) => ({ ...i, orderId })))
      .returning();
  }

  async updateStatus(id: number, status: string) {
    const [order] = await db
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  /**
   * Update an order's status and record the notification trigger event that
   * should be dispatched in the same DB round-trip.
   *
   * This is the preferred method for all workflow-driven status changes so
   * that `lastTriggerEvent` is always in sync with the current status.
   */
  async updateStatusAndTrigger(
    id: number,
    status: string,
    triggerEvent: string,
  ) {
    const [order] = await db
      .update(orders)
      .set({
        status: status as any,
        lastTriggerEvent: triggerEvent,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateStatusIfIn(id: number, status: string, allowed: string[]) {
    const [order] = await db
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(orders.id, id), inArray(orders.status, allowed as any)))
      .returning();
    return order || null;
  }

  async updateItemQuantity(id: number, quantity: number) {
    const [item] = await db
      .update(orderItems)
      .set({ quantity })
      .where(eq(orderItems.id, id))
      .returning();
    return item || null;
  }

  async deleteOrderItem(id: number) {
    const [item] = await db
      .delete(orderItems)
      .where(eq(orderItems.id, id))
      .returning();
    return item || null;
  }

  async cancelItemsByOrder(orderId: number) {
    return db
      .update(orderItems)
      .set({ status: "cancelled" })
      .where(eq(orderItems.orderId, orderId))
      .returning();
  }

  async findBySession(sessionId: number) {
    const sessionOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.tableSessionId, sessionId))
      .orderBy(sql`${orders.createdAt} desc`);

    if (sessionOrders.length === 0) return [];

    const orderIds = sessionOrders.map((o) => o.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    return sessionOrders.map((order) => ({
      ...order,
      items: allItems.filter((item) => item.orderId === order.id),
    }));
  }

  async findByRestaurant(restaurantId: number, status?: string) {
    const conditions = [eq(orders.restaurantId, restaurantId)];
    if (status) {
      conditions.push(eq(orders.status, status as any));
    }

    const restaurantOrders = await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(sql`${orders.createdAt} desc`);

    if (restaurantOrders.length === 0) return [];

    const orderIds = restaurantOrders.map((o) => o.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    return restaurantOrders.map((order) => ({
      ...order,
      items: allItems.filter((item) => item.orderId === order.id),
    }));
  }

  // Kitchen view: orders with status received, preparing, ready
  async getKitchenOrders(restaurantId: number) {
    const kitchenStatuses = ["received", "preparing", "ready"] as const;
    const kitchenOrders = await db
      .select({
        order: orders,
        tableNumber: restaurantTables.tableNumber,
      })
      .from(orders)
      .innerJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
      .innerJoin(
        restaurantTables,
        eq(tableSessions.tableId, restaurantTables.id),
      )
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, [...kitchenStatuses]),
        ),
      )
      .orderBy(sql`${orders.createdAt} asc`);

    if (kitchenOrders.length === 0) return [];

    const orderIds = kitchenOrders.map((o) => o.order.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    return kitchenOrders.map((row) => ({
      ...row.order,
      tableNumber: row.tableNumber,
      items: allItems.filter((item) => item.orderId === row.order.id),
    }));
  }

  // Waiter view: orders that are ready for the waiter to act on.
  // Dynamically determined from the workflow — the status(es) that
  // transition TO "served" (e.g. "ready" in full flow, "received" in no-kitchen flow).
  async getWaiterOrders(restaurantId: number) {
    // Find the status(es) that feed into "served" via active workflows
    const toServedTransitions = await db
      .select({ fromState: restaurantWorkflows.fromState })
      .from(restaurantWorkflows)
      .where(
        and(
          eq(restaurantWorkflows.restaurantId, restaurantId),
          eq(restaurantWorkflows.toState, "served"),
          eq(restaurantWorkflows.isActive, true),
        ),
      );

    const waiterStatuses = toServedTransitions.length > 0
      ? toServedTransitions.map((t) => t.fromState)
      : ["ready"]; // fallback for restaurants without configured workflows

    // Cast to the order_status enum type expected by Drizzle's inArray.
    type OrderStatus = "received" | "preparing" | "ready" | "served" | "paid" | "cancelled";
    const typedStatuses = waiterStatuses as [OrderStatus, ...OrderStatus[]];

    const waiterOrders = await db
      .select({
        order: orders,
        tableNumber: restaurantTables.tableNumber,
      })
      .from(orders)
      .innerJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
      .innerJoin(
        restaurantTables,
        eq(tableSessions.tableId, restaurantTables.id),
      )
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, typedStatuses),
        ),
      )
      .orderBy(sql`${orders.createdAt} asc`);

    if (waiterOrders.length === 0) return [];

    const orderIds = waiterOrders.map((o) => o.order.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    return waiterOrders.map((row) => ({
      ...row.order,
      tableNumber: row.tableNumber,
      items: allItems.filter((item) => item.orderId === row.order.id),
    }));
  }

  async acceptOrder(id: number, userId: string) {
    const [order] = await db
      .update(orders)
      .set({
        acceptedBy: userId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, id), isNull(orders.acceptedBy)))
      .returning();
    return order || null;
  }

  /**
   * Atomically claim an order for delivery (waiter assignment).
   * Uses `WHERE claimed_by IS NULL` to guarantee only one waiter wins.
   * Returns null if already claimed (caller should return 409).
   */
  async claimOrder(id: number, userId: string) {
    const [order] = await db
      .update(orders)
      .set({
        claimedBy: userId,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, id), isNull(orders.claimedBy)))
      .returning();
    return order || null;
  }

  async findWithAcceptor(id: number) {
    const [result] = await db
      .select({
        order: orders,
        acceptorName: userTable.name,
      })
      .from(orders)
      .leftJoin(userTable, eq(orders.acceptedBy, userTable.id))
      .where(eq(orders.id, id));

    if (!result) return null;
    return {
      ...result.order,
      acceptedByName: result.acceptorName,
    };
  }

  /**
   * Cancel all non-terminal orders for a given session (force release).
   * Only cancels orders in received, preparing, or ready status.
   * Returns the list of cancelled orders.
   */
  async cancelPendingBySession(sessionId: number) {
    const nonTerminalStatuses = ["received", "preparing", "ready"] as const;
    return db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(orders.tableSessionId, sessionId),
          inArray(orders.status, [...nonTerminalStatuses]),
        ),
      )
      .returning();
  }

  // ── Purpose-built read endpoints ─────────────────────────────────────────

  /**
   * Delivery view: orders that are ready for a waiter to claim and deliver.
   * Dynamically determines eligible statuses from the workflow (statuses that
   * transition → "served"), falling back to ["ready"] for un-configured restaurants.
   *
   * Equivalent to the old `getWaiterOrders` but renamed to match the new
   * `GET /orders/delivery` route.
   */
  async findDeliveryOrders(restaurantId: number) {
    const toServedTransitions = await db
      .select({ fromState: restaurantWorkflows.fromState })
      .from(restaurantWorkflows)
      .where(
        and(
          eq(restaurantWorkflows.restaurantId, restaurantId),
          eq(restaurantWorkflows.toState, "served"),
          eq(restaurantWorkflows.isActive, true),
        ),
      );

    const deliveryStatuses =
      toServedTransitions.length > 0
        ? toServedTransitions.map((t) => t.fromState)
        : ["ready"];

    type OrderStatus = "received" | "preparing" | "ready" | "served" | "paid" | "cancelled";
    const typedStatuses = deliveryStatuses as [OrderStatus, ...OrderStatus[]];

    const rows = await db
      .select({
        order: orders,
        tableNumber: restaurantTables.tableNumber,
      })
      .from(orders)
      .innerJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
      .innerJoin(
        restaurantTables,
        eq(tableSessions.tableId, restaurantTables.id),
      )
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, typedStatuses),
        ),
      )
      .orderBy(sql`${orders.createdAt} asc`);

    if (rows.length === 0) return [];

    const orderIds = rows.map((r) => r.order.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    return rows.map((row) => ({
      ...row.order,
      tableNumber: row.tableNumber,
      items: allItems.filter((item) => item.orderId === row.order.id),
    }));
  }

  /**
   * Cashier view: active sessions with their non-cancelled orders,
   * grouped so the bill modal can show a per-table breakdown.
   *
   * Returns sessions sorted oldest-first. Within each session, orders are
   * sorted oldest-first so the totals are deterministic.
   */
  async findCashierOrders(restaurantId: number): Promise<
    Array<{
      sessionId: number;
      tableId: number;
      tableNumber: number;
      sessionStartedAt: Date | null;
      orders: Array<{
        id: number;
        orderNumber: string;
        status: string;
        total: string;
        createdAt: Date | null;
        items: Array<{
          id: number;
          itemName: string;
          variantName: string | null;
          quantity: number | null;
          priceAtOrder: string;
          status: string | null;
        }>;
      }>;
    }>
  > {
    // Only non-terminal active sessions that have at least one non-cancelled order
    const rows = await db
      .select({
        sessionId: tableSessions.id,
        tableId: restaurantTables.id,
        tableNumber: restaurantTables.tableNumber,
        sessionStartedAt: tableSessions.startTime,
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderStatus: orders.status,
        orderCreatedAt: orders.createdAt,
        priceAtOrder: sql<string>`
          COALESCE((
            SELECT SUM(oi.price_at_order::numeric * oi.quantity)::text
            FROM order_items oi
            WHERE oi.order_id = ${orders.id}
              AND oi.status != 'cancelled'
          ), '0.00')
        `,
      })
      .from(tableSessions)
      .innerJoin(
        restaurantTables,
        eq(tableSessions.tableId, restaurantTables.id),
      )
      .innerJoin(orders, eq(orders.tableSessionId, tableSessions.id))
      .where(
        and(
          eq(tableSessions.restaurantId, restaurantId),
          eq(tableSessions.status, "active"),
          ne(orders.status, "cancelled"),
          ne(orders.status, "paid"),
        ),
      )
      .orderBy(
        sql`${tableSessions.startTime} asc`,
        sql`${orders.createdAt} asc`,
      );

    if (rows.length === 0) return [];

    // Group by session
    const orderIds = [...new Set(rows.map((r) => r.orderId))];
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const sessionMap = new Map<
      number,
      {
        sessionId: number;
        tableId: number;
        tableNumber: number;
        sessionStartedAt: Date | null;
        orders: Map<number, (typeof rows)[0] & { itemsList: typeof allItems }>;
      }
    >();

    for (const row of rows) {
      if (!sessionMap.has(row.sessionId)) {
        sessionMap.set(row.sessionId, {
          sessionId: row.sessionId,
          tableId: row.tableId,
          tableNumber: row.tableNumber,
          sessionStartedAt: row.sessionStartedAt,
          orders: new Map(),
        });
      }
      const session = sessionMap.get(row.sessionId)!;
      if (!session.orders.has(row.orderId)) {
        session.orders.set(row.orderId, { ...row, itemsList: [] });
      }
    }

    for (const item of allItems) {
      for (const session of sessionMap.values()) {
        const order = session.orders.get(item.orderId);
        if (order) {
          order.itemsList.push(item);
          break;
        }
      }
    }

    return [...sessionMap.values()].map((session) => ({
      sessionId: session.sessionId,
      tableId: session.tableId,
      tableNumber: session.tableNumber,
      sessionStartedAt: session.sessionStartedAt,
      orders: [...session.orders.values()].map((o) => ({
        id: o.orderId,
        orderNumber: o.orderNumber,
        status: o.orderStatus ?? "received",
        total: o.priceAtOrder,
        createdAt: o.orderCreatedAt,
        items: o.itemsList.map((i) => ({
          id: i.id,
          itemName: i.itemName,
          variantName: i.variantName ?? null,
          quantity: i.quantity,
          priceAtOrder: i.priceAtOrder,
          status: i.status,
        })),
      })),
    }));
  }

  /**
   * Overview: minimal order fields with NO items array, for the manager/owner
   * overview screen. Excludes terminal (paid, cancelled) orders.
   */
  async findOrdersOverview(
    restaurantId: number,
    status?: string,
  ): Promise<
    Array<{
      id: number;
      orderNumber: string;
      status: string | null;
      tableNumber: number | null;
      acceptedBy: string | null;
      claimedBy: string | null;
      notes: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }>
  > {
    const conditions = [eq(orders.restaurantId, restaurantId)];

    if (status) {
      conditions.push(eq(orders.status, status as any));
    } else {
      // Exclude terminal states for the live overview
      conditions.push(ne(orders.status, "paid"), ne(orders.status, "cancelled"));
    }

    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        tableNumber: restaurantTables.tableNumber,
        acceptedBy: orders.acceptedBy,
        claimedBy: orders.claimedBy,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(tableSessions, eq(orders.tableSessionId, tableSessions.id))
      .leftJoin(
        restaurantTables,
        eq(tableSessions.tableId, restaurantTables.id),
      )
      .where(and(...conditions))
      .orderBy(sql`${orders.createdAt} desc`);

    return rows;
  }

  async calculateSessionTotal(sessionId: number): Promise<string> {
    const sessionOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tableSessionId, sessionId),
          sql`${orders.status} != 'cancelled'`,
        ),
      );

    if (sessionOrders.length === 0) return "0.00";

    const orderIds = sessionOrders.map((o) => o.id);
    const allItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    let total = 0;
    for (const item of allItems) {
      if (item.status !== "cancelled") {
        total += parseFloat(item.priceAtOrder) * (item.quantity ?? 1);
      }
    }

    return total.toFixed(2);
  }
}

export const orderRepository = new OrderRepository();
