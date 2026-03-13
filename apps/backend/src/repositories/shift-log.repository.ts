import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@menugo/data";
import { shiftLogs } from "@menugo/data/schemas";

class ShiftLogRepository {
  /** Create a new shift log entry when a user clocks in. */
  async createEntry(userId: string, restaurantId: number) {
    const [entry] = await db
      .insert(shiftLogs)
      .values({
        userId,
        restaurantId,
        clockedInAt: new Date(),
      })
      .returning();
    return entry;
  }

  /** Close the most recent open shift log for a user (set clockedOutAt + duration). */
  async closeEntry(userId: string, restaurantId: number) {
    // Find the open entry (clockedOutAt is null)
    const [open] = await db
      .select()
      .from(shiftLogs)
      .where(
        and(
          eq(shiftLogs.userId, userId),
          eq(shiftLogs.restaurantId, restaurantId),
          isNull(shiftLogs.clockedOutAt),
        ),
      )
      .orderBy(desc(shiftLogs.clockedInAt))
      .limit(1);

    if (!open) return null;

    const now = new Date();
    const durationMs = now.getTime() - open.clockedInAt.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const [updated] = await db
      .update(shiftLogs)
      .set({
        clockedOutAt: now,
        durationMinutes,
      })
      .where(eq(shiftLogs.id, open.id))
      .returning();
    return updated;
  }

  /** Get shift logs for a restaurant, most recent first. */
  async findByRestaurant(restaurantId: number, limit = 100) {
    return db
      .select()
      .from(shiftLogs)
      .where(eq(shiftLogs.restaurantId, restaurantId))
      .orderBy(desc(shiftLogs.clockedInAt))
      .limit(limit);
  }

  /** Get shift logs for a specific user in a restaurant. */
  async findByUser(userId: string, restaurantId: number, limit = 50) {
    return db
      .select()
      .from(shiftLogs)
      .where(
        and(
          eq(shiftLogs.userId, userId),
          eq(shiftLogs.restaurantId, restaurantId),
        ),
      )
      .orderBy(desc(shiftLogs.clockedInAt))
      .limit(limit);
  }
}

export const shiftLogRepository = new ShiftLogRepository();
