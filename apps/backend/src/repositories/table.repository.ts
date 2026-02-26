import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { restaurantTables, user as userTable } from "@menugo/data/schemas";

class TableRepository {
  async findByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.restaurantId, restaurantId));
  }

  /**
   * Fetch all tables for a restaurant, including the blocker's name
   * so the UI can display "Blocked by <name>".
   */
  async findByRestaurantWithBlockInfo(restaurantId: number) {
    return db
      .select({
        id: restaurantTables.id,
        restaurantId: restaurantTables.restaurantId,
        tableNumber: restaurantTables.tableNumber,
        qrCode: restaurantTables.qrCode,
        capacity: restaurantTables.capacity,
        isActive: restaurantTables.isActive,
        helperBlockedBy: restaurantTables.helperBlockedBy,
        helperBlockedAt: restaurantTables.helperBlockedAt,
        helperBlockedByName: userTable.name,
        updatedAt: restaurantTables.updatedAt,
      })
      .from(restaurantTables)
      .leftJoin(userTable, eq(restaurantTables.helperBlockedBy, userTable.id))
      .where(eq(restaurantTables.restaurantId, restaurantId));
  }

  async findById(id: number) {
    const [table] = await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.id, id));
    return table || null;
  }

  async findByNumber(restaurantId: number, tableNumber: number) {
    const [table] = await db
      .select()
      .from(restaurantTables)
      .where(
        and(
          eq(restaurantTables.restaurantId, restaurantId),
          eq(restaurantTables.tableNumber, tableNumber),
        ),
      );
    return table || null;
  }

  async create(restaurantId: number, tableNumber: number, capacity: number) {
    const [table] = await db
      .insert(restaurantTables)
      .values({ restaurantId, tableNumber, capacity })
      .returning();
    return table;
  }

  async bulkCreate(
    restaurantId: number,
    from: number,
    to: number,
    capacity: number,
  ) {
    const values = [];
    for (let i = from; i <= to; i++) {
      values.push({ restaurantId, tableNumber: i, capacity });
    }
    return db.insert(restaurantTables).values(values).returning();
  }

  async update(
    id: number,
    data: { capacity?: number; isActive?: boolean; qrCode?: string },
  ) {
    const [table] = await db
      .update(restaurantTables)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(restaurantTables.id, id))
      .returning();
    return table;
  }

  async delete(id: number) {
    const [table] = await db
      .delete(restaurantTables)
      .where(eq(restaurantTables.id, id))
      .returning();
    return table;
  }

  /**
   * Set the helper block on a table.
   */
  async block(id: number, userId: string) {
    const [table] = await db
      .update(restaurantTables)
      .set({
        helperBlockedBy: userId,
        helperBlockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(restaurantTables.id, id))
      .returning();
    return table;
  }

  /**
   * Clear the helper block on a table.
   */
  async unblock(id: number) {
    const [table] = await db
      .update(restaurantTables)
      .set({
        helperBlockedBy: null,
        helperBlockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(restaurantTables.id, id))
      .returning();
    return table;
  }
}

export const tableRepository = new TableRepository();
