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
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    return { ...order, items };
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

  // Waiter view: orders with status ready (need delivery)
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
        and(eq(orders.restaurantId, restaurantId), eq(orders.status, "ready")),
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
}

export const orderRepository = new OrderRepository();
