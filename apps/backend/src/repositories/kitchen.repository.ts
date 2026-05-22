import { and, eq, inArray } from "drizzle-orm";
import { db } from "@menugo/data";
import {
  kitchenMembers,
  kitchenMenuItems,
  kitchens,
  menuItems,
} from "@menugo/data/schemas";

class KitchenRepository {
  async findByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(kitchens)
      .where(eq(kitchens.restaurantId, restaurantId));
  }

  async findById(id: number) {
    const [k] = await db.select().from(kitchens).where(eq(kitchens.id, id));
    return k || null;
  }

  async create(restaurantId: number, name: string) {
    const [k] = await db
      .insert(kitchens)
      .values({ restaurantId, name })
      .returning();
    return k;
  }

  async update(id: number, data: { name?: string; isActive?: boolean }) {
    const [k] = await db
      .update(kitchens)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kitchens.id, id))
      .returning();
    return k;
  }

  async delete(id: number) {
    const [k] = await db
      .delete(kitchens)
      .where(eq(kitchens.id, id))
      .returning();
    return k;
  }

  async setMenuItemKitchen(menuItemId: number, kitchenId: number | null) {
    const result = await db.transaction(async (tx) => {
      await tx
        .delete(kitchenMenuItems)
        .where(eq(kitchenMenuItems.menuItemId, menuItemId));
      if (!kitchenId) return null;
      const [m] = await tx
        .insert(kitchenMenuItems)
        .values({ kitchenId, menuItemId })
        .returning();
      return m;
    });
    return result;
  }

  async findKitchenIdByMenuItem(menuItemId: number) {
    const [m] = await db
      .select({ kitchenId: kitchenMenuItems.kitchenId })
      .from(kitchenMenuItems)
      .where(eq(kitchenMenuItems.menuItemId, menuItemId));
    return m?.kitchenId ?? null;
  }

  async findKitchenIdsByMenuItemIds(menuItemIds: number[]) {
    if (menuItemIds.length === 0) return [] as number[];
    const rows = await db
      .select({ kitchenId: kitchenMenuItems.kitchenId })
      .from(kitchenMenuItems)
      .where(inArray(kitchenMenuItems.menuItemId, menuItemIds));
    return [...new Set(rows.map((r) => r.kitchenId))];
  }

  async addMember(kitchenId: number, userId: string) {
    const [m] = await db
      .insert(kitchenMembers)
      .values({ kitchenId, userId })
      .returning();
    return m;
  }

  async removeMember(kitchenId: number, userId: string) {
    const [m] = await db
      .delete(kitchenMembers)
      .where(
        and(
          eq(kitchenMembers.kitchenId, kitchenId),
          eq(kitchenMembers.userId, userId),
        ),
      )
      .returning();
    return m;
  }

  async findMembersByKitchenId(kitchenId: number) {
    return db
      .select({ userId: kitchenMembers.userId })
      .from(kitchenMembers)
      .where(eq(kitchenMembers.kitchenId, kitchenId));
  }

  async findMemberUserIdsByKitchenIds(kitchenIds: number[]) {
    if (kitchenIds.length === 0) return [] as string[];
    const rows = await db
      .select({ userId: kitchenMembers.userId })
      .from(kitchenMembers)
      .innerJoin(kitchens, eq(kitchens.id, kitchenMembers.kitchenId))
      .where(
        and(
          inArray(kitchenMembers.kitchenId, kitchenIds),
          eq(kitchens.isActive, true),
        ),
      );
    return [...new Set(rows.map((r) => r.userId))];
  }
}

export const kitchenRepository = new KitchenRepository();
