import { eq, and, sql, inArray, isNull } from "drizzle-orm";
import { db } from "@menugo/data";
import {
  orders,
  orderItems,
  tableSessions,
  restaurantTables,
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
    const items = await this.findItemsByOrder(id);
    return { ...order, items };
  }

  async findItemById(itemId: number) {
    const [item] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, itemId));
    return item || null;
  }

  async findItemsByOrder(orderId: number) {
    const items = await db
      .select({
        item: orderItems,
        kitchenAcceptorName: sql<string | null>`kitchen_acceptor.name`,
        waiterAcceptorName: sql<string | null>`waiter_acceptor.name`,
      })
      .from(orderItems)
      .leftJoin(
        sql`${userTable} AS kitchen_acceptor`,
        sql`kitchen_acceptor.id = ${orderItems.acceptedByKitchen}`,
      )
      .leftJoin(
        sql`${userTable} AS waiter_acceptor`,
        sql`waiter_acceptor.id = ${orderItems.acceptedByWaiter}`,
      )
      .where(eq(orderItems.orderId, orderId));

    return items.map((r) => ({
      ...r.item,
      acceptedByKitchenName: r.kitchenAcceptorName,
      acceptedByWaiterName: r.waiterAcceptorName,
    }));
  }

  async create(data: {
    restaurantId: number;
    tableSessionId: number;
    createdBy?: string;
    createdByDeviceId?: string;
    orderNumber: string;
    notes?: string;
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

  /** Update a single order item's status */
  async updateItemStatus(itemId: number, status: string) {
    const [item] = await db
      .update(orderItems)
      .set({ status: status as any })
      .where(eq(orderItems.id, itemId))
      .returning();
    return item;
  }

  /**
   * Accept a specific order item by kitchen or waiter staff.
   * Kitchen claims items to prepare; waiter claims items to deliver.
   */
  async acceptOrderItem(
    itemId: number,
    userId: string,
    role: "kitchen" | "waiter",
  ) {
    const isKitchen = role === "kitchen";
    const alreadyAcceptedField = isKitchen
      ? orderItems.acceptedByKitchen
      : orderItems.acceptedByWaiter;

    const [item] = await db
      .update(orderItems)
      .set(
        isKitchen
          ? { acceptedByKitchen: userId, acceptedByKitchenAt: new Date() }
          : { acceptedByWaiter: userId, acceptedByWaiterAt: new Date() },
      )
      .where(
        and(eq(orderItems.id, itemId), isNull(alreadyAcceptedField)),
      )
      .returning();

    return item || null;
  }

  /**
   * Compute the aggregate status of an order from its items.
   * Logic:
   *  - Any item is "cancelled" and not all cancelled → ignore cancelled, check rest
   *  - All items cancelled → order is "cancelled"
   *  - All items paid → order is "paid" (won't usually happen at item level)
   *  - All items served → order is "served"
   *  - All items ready → order is "ready"
   *  - Any item preparing → order is "preparing"
   *  - Otherwise → "received"
   */
  async computeOrderStatusFromItems(orderId: number): Promise<string> {
    const items = await db
      .select({ status: orderItems.status })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    if (items.length === 0) return "received";

    const statuses = items.map((i) => i.status || "received");
    const activeStatuses = statuses.filter((s) => s !== "cancelled");

    if (activeStatuses.length === 0) return "cancelled";

    if (activeStatuses.every((s) => s === "served" || s === "paid")) return "served";
    if (activeStatuses.every((s) => s === "ready" || s === "served" || s === "paid")) return "ready";
    if (activeStatuses.some((s) => s === "preparing")) return "preparing";

    return "received";
  }

  async findBySession(sessionId: number) {
    const sessionOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.tableSessionId, sessionId))
      .orderBy(sql`${orders.createdAt} desc`);

    if (sessionOrders.length === 0) return [];

    const orderIds = sessionOrders.map((o) => o.id);
    const allItems = await this._getItemsWithAcceptors(orderIds);

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
    const allItems = await this._getItemsWithAcceptors(orderIds);

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
    const allItems = await this._getItemsWithAcceptors(orderIds);

    return kitchenOrders.map((row) => ({
      ...row.order,
      tableNumber: row.tableNumber,
      items: allItems.filter((item) => item.orderId === row.order.id),
    }));
  }

  // Waiter view: items with status ready (any order), grouped by table
  async getWaiterOrders(restaurantId: number) {
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
          inArray(orders.status, ["received", "preparing", "ready"] as any[]),
        ),
      )
      .orderBy(sql`${orders.createdAt} asc`);

    if (waiterOrders.length === 0) return [];

    const orderIds = waiterOrders.map((o) => o.order.id);
    const allItems = await this._getItemsWithAcceptors(orderIds);

    // Only return items with status "ready" for the waiter view
    return waiterOrders
      .map((row) => ({
        ...row.order,
        tableNumber: row.tableNumber,
        items: allItems.filter(
          (item) => item.orderId === row.order.id && item.status === "ready",
        ),
      }))
      .filter((order) => order.items.length > 0);
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

  /** Internal helper to fetch items with acceptor names for a set of order IDs */
  private async _getItemsWithAcceptors(orderIds: number[]) {
    if (orderIds.length === 0) return [];

    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    // Gather all unique user IDs referenced as acceptors
    const userIds = [
      ...new Set([
        ...items.map((i) => i.acceptedByKitchen).filter(Boolean),
        ...items.map((i) => i.acceptedByWaiter).filter(Boolean),
      ]),
    ] as string[];

    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const users = await db
        .select({ id: userTable.id, name: userTable.name })
        .from(userTable)
        .where(inArray(userTable.id, userIds));
      userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
    }

    return items.map((item) => ({
      ...item,
      acceptedByKitchenName: item.acceptedByKitchen
        ? userMap[item.acceptedByKitchen]
        : undefined,
      acceptedByWaiterName: item.acceptedByWaiter
        ? userMap[item.acceptedByWaiter]
        : undefined,
    }));
  }
}

export const orderRepository = new OrderRepository();
