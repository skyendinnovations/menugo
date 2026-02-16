import { eq, and, sql } from "drizzle-orm";
import { db } from "@menugo/data";
import { tableSessions, restaurantTables } from "@menugo/data/schemas";

function generateJoinCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

class SessionRepository {
  async findById(id: number) {
    const [session] = await db
      .select()
      .from(tableSessions)
      .where(eq(tableSessions.id, id));
    return session || null;
  }

  async findByJoinCode(joinCode: string) {
    const [session] = await db
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.joinCode, joinCode),
          eq(tableSessions.status, "active"),
        ),
      );
    return session || null;
  }

  async findAllActiveByTable(tableId: number) {
    return db
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.tableId, tableId),
          eq(tableSessions.status, "active"),
        ),
      );
  }

  async findActiveByRestaurant(restaurantId: number) {
    return db
      .select({
        session: tableSessions,
        tableNumber: restaurantTables.tableNumber,
      })
      .from(tableSessions)
      .innerJoin(
        restaurantTables,
        eq(tableSessions.tableId, restaurantTables.id),
      )
      .where(
        and(
          eq(tableSessions.restaurantId, restaurantId),
          eq(tableSessions.status, "active"),
        ),
      );
  }

  async create(data: {
    restaurantId: number;
    tableId: number;
    hostDeviceId: string;
    personsCount: number;
    customerName?: string;
  }) {
    // Generate unique join code (retry if collision)
    let joinCode = generateJoinCode();
    for (let i = 0; i < 10; i++) {
      const existing = await this.findByJoinCode(joinCode);
      if (!existing) break;
      joinCode = generateJoinCode();
    }

    // Atomic INSERT with capacity sub-query guard — prevents race condition
    // The INSERT only produces a row when occupied + requested ≤ table capacity.
    const result = await db.execute(sql`
      INSERT INTO table_sessions (restaurant_id, table_id, join_code, host_device_id, persons_count, customer_name)
      SELECT ${data.restaurantId}, ${data.tableId}, ${joinCode}, ${data.hostDeviceId}, ${data.personsCount}, ${data.customerName ?? null}
      WHERE (
        COALESCE(
          (SELECT SUM(persons_count) FROM table_sessions WHERE table_id = ${data.tableId} AND status = 'active'),
          0
        ) + ${data.personsCount}
      ) <= (
        SELECT capacity FROM restaurant_tables WHERE id = ${data.tableId}
      )
      RETURNING id
    `);

    if (!result.rows || result.rows.length === 0) {
      return null; // Capacity exceeded (race-condition safety net)
    }

    // Re-fetch with proper Drizzle typing
    const insertedId = (result.rows[0] as { id: number }).id;
    return this.findById(insertedId);
  }

  async close(id: number, endedBy: string, calculatedTotal: string) {
    const [session] = await db
      .update(tableSessions)
      .set({
        status: "closed",
        endedBy,
        calculatedTotal,
        endTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tableSessions.id, id))
      .returning();
    return session;
  }

  async findAllByRestaurant(restaurantId: number) {
    return db
      .select({
        session: tableSessions,
        tableNumber: restaurantTables.tableNumber,
      })
      .from(tableSessions)
      .innerJoin(
        restaurantTables,
        eq(tableSessions.tableId, restaurantTables.id),
      )
      .where(eq(tableSessions.restaurantId, restaurantId))
      .orderBy(sql`${tableSessions.startTime} desc`);
  }
}

export const sessionRepository = new SessionRepository();
