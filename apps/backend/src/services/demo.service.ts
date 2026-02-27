import { db } from "@menugo/data";
import { eq, and } from "drizzle-orm";
import {
  restaurants,
  restaurantTables,
  menuCategories,
  menuItems,
  tableSessions,
  orders,
  orderItems,
  sessionParticipants,
} from "@menugo/data/schemas";
import { restaurantRepository } from "../repositories/restaurant.repository";
import { logger } from "../utils/logger";

/**
 * Demo / Training mode service.
 *
 * When a restaurant enables demo mode:
 *   • Notifications (FCM) are suppressed.
 *   • The "Reset Demo Data" action wipes transactional data (orders, sessions)
 *     and optionally seeds sample menu items, tables, and fake orders so staff
 *     can practise the workflow without affecting real data.
 */
class DemoService {
  async toggleDemoMode(restaurantId: number, enabled: boolean) {
    return restaurantRepository.setDemoMode(restaurantId, enabled);
  }

  /**
   * Wipe all transactional data for a demo restaurant and re-seed sample data.
   */
  async resetDemoData(restaurantId: number) {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");
    if (!restaurant.isDemoMode) {
      throw new Error(
        "Cannot reset data: restaurant is not in demo/training mode",
      );
    }

    logger.info(
      `Resetting demo data for restaurant ${restaurantId} (${restaurant.name})`,
    );

    // 1. Delete transactional data (order_items cascade via orders, participants via sessions)
    //    Delete orders first (they reference sessions)
    const restaurantOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId));
    if (restaurantOrders.length > 0) {
      for (const o of restaurantOrders) {
        await db.delete(orderItems).where(eq(orderItems.orderId, o.id));
      }
      await db.delete(orders).where(eq(orders.restaurantId, restaurantId));
    }

    // Delete sessions (participants cascade)
    const restaurantSessions = await db
      .select({ id: tableSessions.id })
      .from(tableSessions)
      .where(eq(tableSessions.restaurantId, restaurantId));
    if (restaurantSessions.length > 0) {
      for (const s of restaurantSessions) {
        await db
          .delete(sessionParticipants)
          .where(eq(sessionParticipants.sessionId, s.id));
      }
      await db
        .delete(tableSessions)
        .where(eq(tableSessions.restaurantId, restaurantId));
    }

    // 2. Check if tables exist, if not seed sample tables
    const existingTables = await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.restaurantId, restaurantId));

    if (existingTables.length === 0) {
      await this.seedSampleTables(restaurantId);
    }

    // 3. Check if menu exists, if not seed sample menu
    const existingCategories = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId));

    if (existingCategories.length === 0) {
      await this.seedSampleMenu(restaurantId);
    }

    // 4. Seed sample orders for practice
    await this.seedSampleOrders(restaurantId);

    logger.info(`Demo data reset complete for restaurant ${restaurantId}`);

    return { message: "Demo data reset successfully" };
  }

  private async seedSampleTables(restaurantId: number) {
    const sampleTables = Array.from({ length: 6 }, (_, i) => ({
      restaurantId,
      tableNumber: i + 1,
      capacity: i < 2 ? 2 : i < 4 ? 4 : 6,
      isActive: true,
    }));

    await db.insert(restaurantTables).values(sampleTables);
  }

  private async seedSampleMenu(restaurantId: number) {
    // Create categories
    const [starters] = await db
      .insert(menuCategories)
      .values({
        restaurantId,
        name: "Starters",
        displayOrder: 1,
        isActive: true,
      })
      .returning();

    const [mains] = await db
      .insert(menuCategories)
      .values({
        restaurantId,
        name: "Main Course",
        displayOrder: 2,
        isActive: true,
      })
      .returning();

    const [drinks] = await db
      .insert(menuCategories)
      .values({
        restaurantId,
        name: "Beverages",
        displayOrder: 3,
        isActive: true,
      })
      .returning();

    // Seed items
    const items = [
      {
        restaurantId,
        categoryId: starters!.id,
        name: "Demo Soup",
        price: "5.99",
        isVeg: true,
        isAvailable: true,
        isActive: true,
      },
      {
        restaurantId,
        categoryId: starters!.id,
        name: "Demo Spring Rolls",
        price: "7.49",
        isVeg: true,
        isAvailable: true,
        isActive: true,
      },
      {
        restaurantId,
        categoryId: starters!.id,
        name: "Demo Chicken Wings",
        price: "9.99",
        isVeg: false,
        isAvailable: true,
        isActive: true,
      },
      {
        restaurantId,
        categoryId: mains!.id,
        name: "Demo Pasta",
        price: "12.99",
        isVeg: true,
        isAvailable: true,
        isActive: true,
      },
      {
        restaurantId,
        categoryId: mains!.id,
        name: "Demo Grilled Chicken",
        price: "14.99",
        isVeg: false,
        isAvailable: true,
        isActive: true,
      },
      {
        restaurantId,
        categoryId: mains!.id,
        name: "Demo Burger",
        price: "11.49",
        isVeg: false,
        isAvailable: true,
        isActive: true,
      },
      {
        restaurantId,
        categoryId: drinks!.id,
        name: "Demo Lemonade",
        price: "3.99",
        isVeg: true,
        isAvailable: true,
        isActive: true,
      },
      {
        restaurantId,
        categoryId: drinks!.id,
        name: "Demo Coffee",
        price: "4.49",
        isVeg: true,
        isAvailable: true,
        isActive: true,
      },
    ];

    await db.insert(menuItems).values(items);
  }

  private async seedSampleOrders(restaurantId: number) {
    // Get existing tables
    const tables = await db
      .select()
      .from(restaurantTables)
      .where(
        and(
          eq(restaurantTables.restaurantId, restaurantId),
          eq(restaurantTables.isActive, true),
        ),
      );

    if (tables.length === 0) return;

    // Get existing menu items
    const items = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, restaurantId),
          eq(menuItems.isActive, true),
          eq(menuItems.isAvailable, true),
        ),
      );

    if (items.length === 0) return;

    // Create 3 sample sessions on different tables
    const sampleSessions = tables.slice(0, 3).map((table) => ({
      restaurantId,
      tableId: table.id,
      joinCode: String(1000 + table.tableNumber).slice(0, 4),
      hostDeviceId: `demo-device-${table.tableNumber}`,
      personsCount: 2,
      status: "active" as const,
    }));

    const createdSessions = await db
      .insert(tableSessions)
      .values(sampleSessions)
      .returning();

    // Create sample orders with different statuses for practice
    const statuses = ["received", "preparing", "ready"] as const;
    let orderCounter = 1;

    for (let i = 0; i < createdSessions.length; i++) {
      const session = createdSessions[i]!;
      const status = statuses[i % statuses.length]!;
      const orderNumber = `DEMO-${String(orderCounter++).padStart(3, "0")}`;

      const [order] = await db
        .insert(orders)
        .values({
          restaurantId,
          tableSessionId: session.id,
          orderNumber,
          status,
          createdByDeviceId: `demo-device-${i + 1}`,
        })
        .returning();

      if (!order) continue;

      // Add 2-3 items per order
      const orderItemValues = items.slice(0, 2 + (i % 2)).map((item) => ({
        orderId: order.id,
        menuItemId: item.id,
        itemName: item.name,
        priceAtOrder: item.price,
        quantity: 1 + (i % 3),
        status: status,
      }));

      await db.insert(orderItems).values(orderItemValues);
    }
  }
}

export const demoService = new DemoService();
