import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { staffAvailability } from "@menugo/data/schemas";

class AvailabilityRepository {
  async findByUserAndRestaurant(userId: string, restaurantId: number) {
    const [entry] = await db
      .select()
      .from(staffAvailability)
      .where(
        and(
          eq(staffAvailability.userId, userId),
          eq(staffAvailability.restaurantId, restaurantId),
        ),
      );
    return entry || null;
  }

  async clockIn(userId: string, restaurantId: number) {
    const existing = await this.findByUserAndRestaurant(userId, restaurantId);

    if (existing) {
      const [updated] = await db
        .update(staffAvailability)
        .set({
          status: "clocked_in",
          clockedInAt: new Date(),
          clockedOutAt: null,
          activeOrderCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(staffAvailability.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(staffAvailability)
      .values({
        userId,
        restaurantId,
        status: "clocked_in",
        clockedInAt: new Date(),
        activeOrderCount: 0,
      })
      .returning();
    return created;
  }

  async clockOut(userId: string, restaurantId: number) {
    const existing = await this.findByUserAndRestaurant(userId, restaurantId);
    if (!existing) return null;

    const [updated] = await db
      .update(staffAvailability)
      .set({
        status: "clocked_out",
        clockedOutAt: new Date(),
        activeOrderCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(staffAvailability.id, existing.id))
      .returning();
    return updated;
  }

  async findByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(staffAvailability)
      .where(eq(staffAvailability.restaurantId, restaurantId));
  }

  async findClockedIn(restaurantId: number) {
    return db
      .select()
      .from(staffAvailability)
      .where(
        and(
          eq(staffAvailability.restaurantId, restaurantId),
          eq(staffAvailability.status, "clocked_in"),
        ),
      );
  }

  async findAvailableStaff(restaurantId: number) {
    return db
      .select()
      .from(staffAvailability)
      .where(
        and(
          eq(staffAvailability.restaurantId, restaurantId),
          eq(staffAvailability.status, "clocked_in"),
          eq(staffAvailability.activeOrderCount, 0),
        ),
      );
  }

  async incrementActiveOrders(userId: string, restaurantId: number) {
    const existing = await this.findByUserAndRestaurant(userId, restaurantId);
    if (!existing) return null;

    const [updated] = await db
      .update(staffAvailability)
      .set({
        activeOrderCount: (existing.activeOrderCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(staffAvailability.id, existing.id))
      .returning();
    return updated;
  }

  async decrementActiveOrders(userId: string, restaurantId: number) {
    const existing = await this.findByUserAndRestaurant(userId, restaurantId);
    if (!existing) return null;

    const newCount = Math.max(0, (existing.activeOrderCount ?? 0) - 1);
    const [updated] = await db
      .update(staffAvailability)
      .set({
        activeOrderCount: newCount,
        updatedAt: new Date(),
      })
      .where(eq(staffAvailability.id, existing.id))
      .returning();
    return updated;
  }
}

export const availabilityRepository = new AvailabilityRepository();
