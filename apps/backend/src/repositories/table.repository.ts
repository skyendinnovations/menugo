import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { restaurantTables } from "@menugo/data/schemas";

class TableRepository {
  async findByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(restaurantTables)
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
}

export const tableRepository = new TableRepository();
