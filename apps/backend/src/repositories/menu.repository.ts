import { eq, and, sql } from "drizzle-orm";
import { db } from "@menugo/data";
import {
  menuCategories,
  menuItems,
  menuItemVariants,
} from "@menugo/data/schemas";

class MenuRepository {
  // --- Categories ---
  async findCategoriesByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId))
      .orderBy(menuCategories.displayOrder);
  }

  async findCategoryById(id: number) {
    const [cat] = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.id, id));
    return cat || null;
  }

  async createCategory(
    restaurantId: number,
    name: string,
    displayOrder?: number,
  ) {
    const [cat] = await db
      .insert(menuCategories)
      .values({ restaurantId, name, displayOrder: displayOrder ?? 0 })
      .returning();
    return cat;
  }

  async updateCategory(
    id: number,
    data: { name?: string; displayOrder?: number; isActive?: boolean },
  ) {
    const [cat] = await db
      .update(menuCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(menuCategories.id, id))
      .returning();
    return cat;
  }

  async deleteCategory(id: number) {
    const [cat] = await db
      .delete(menuCategories)
      .where(eq(menuCategories.id, id))
      .returning();
    return cat;
  }

  // --- Items ---
  async findItemsByCategory(categoryId: number) {
    return db
      .select()
      .from(menuItems)
      .where(eq(menuItems.categoryId, categoryId));
  }

  async findItemsByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));
  }

  async findItemById(id: number) {
    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id));
    return item || null;
  }

  async createItem(data: {
    restaurantId: number;
    categoryId: number;
    name: string;
    description?: string;
    price: string;
    isVeg?: boolean;
    imagePath?: string;
    hasVariants?: boolean;
  }) {
    const [item] = await db.insert(menuItems).values(data).returning();
    return item;
  }

  async updateItem(
    id: number,
    data: {
      categoryId?: number;
      name?: string;
      description?: string;
      price?: string;
      isVeg?: boolean;
      imagePath?: string;
      isAvailable?: boolean;
      isActive?: boolean;
      hasVariants?: boolean;
    },
  ) {
    const [item] = await db
      .update(menuItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  async toggleAvailability(id: number) {
    const item = await this.findItemById(id);
    if (!item) return null;
    const [updated] = await db
      .update(menuItems)
      .set({ isAvailable: !item.isAvailable, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  async deleteItem(id: number) {
    const [item] = await db
      .delete(menuItems)
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  // --- Variants ---
  async findVariantsByItem(menuItemId: number) {
    return db
      .select()
      .from(menuItemVariants)
      .where(eq(menuItemVariants.menuItemId, menuItemId));
  }

  async findVariantById(id: number) {
    const [v] = await db
      .select()
      .from(menuItemVariants)
      .where(eq(menuItemVariants.id, id));
    return v || null;
  }

  async createVariant(menuItemId: number, name: string, price: string) {
    const [v] = await db
      .insert(menuItemVariants)
      .values({ menuItemId, name, price })
      .returning();
    return v;
  }

  async updateVariant(
    id: number,
    data: { name?: string; price?: string; isActive?: boolean },
  ) {
    const [v] = await db
      .update(menuItemVariants)
      .set(data)
      .where(eq(menuItemVariants.id, id))
      .returning();
    return v;
  }

  async deleteVariant(id: number) {
    const [v] = await db
      .delete(menuItemVariants)
      .where(eq(menuItemVariants.id, id))
      .returning();
    return v;
  }

  // --- Stock Management ---

  /** Set stock count for a menu item. Pass null for unlimited. */
  async updateItemStock(id: number, stockCount: number | null) {
    const isSoldOut = stockCount !== null && stockCount <= 0;
    const [item] = await db
      .update(menuItems)
      .set({
        stockCount,
        isSoldOut,
        isAvailable: isSoldOut ? false : undefined,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  /** Toggle sold-out status for a menu item. */
  async toggleItemSoldOut(id: number, isSoldOut: boolean) {
    const [item] = await db
      .update(menuItems)
      .set({
        isSoldOut,
        isAvailable: isSoldOut ? false : true,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  /**
   * Atomically decrement stock for a menu item.
   * Returns the updated item, or null if stock is insufficient.
   */
  async decrementItemStock(id: number, quantity: number) {
    const [item] = await db
      .update(menuItems)
      .set({
        stockCount: sql`${menuItems.stockCount} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(menuItems.id, id),
          sql`${menuItems.stockCount} IS NOT NULL AND ${menuItems.stockCount} >= ${quantity}`,
        ),
      )
      .returning();
    return item || null;
  }

  /**
   * Atomically increment stock for a menu item.
   * Only applies to tracked stock (stockCount IS NOT NULL).
   */
  async incrementItemStock(id: number, quantity: number) {
    const [item] = await db
      .update(menuItems)
      .set({
        stockCount: sql`${menuItems.stockCount} + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(menuItems.id, id),
          sql`${menuItems.stockCount} IS NOT NULL`,
        ),
      )
      .returning();
    return item || null;
  }

  /** Auto-mark item as sold out when stock hits zero. */
  async markSoldOutIfZero(id: number) {
    const [item] = await db
      .update(menuItems)
      .set({ isSoldOut: true, isAvailable: false, updatedAt: new Date() })
      .where(
        and(
          eq(menuItems.id, id),
          sql`${menuItems.stockCount} IS NOT NULL AND ${menuItems.stockCount} <= 0`,
        ),
      )
      .returning();
    return item || null;
  }

  /** Set stock count for a variant. Pass null for unlimited. */
  async updateVariantStock(id: number, stockCount: number | null) {
    const isSoldOut = stockCount !== null && stockCount <= 0;
    const [v] = await db
      .update(menuItemVariants)
      .set({ stockCount, isSoldOut })
      .where(eq(menuItemVariants.id, id))
      .returning();
    return v;
  }

  /** Toggle sold-out status for a variant. */
  async toggleVariantSoldOut(id: number, isSoldOut: boolean) {
    const [v] = await db
      .update(menuItemVariants)
      .set({ isSoldOut })
      .where(eq(menuItemVariants.id, id))
      .returning();
    return v;
  }

  /**
   * Atomically decrement stock for a variant.
   * Returns the updated variant, or null if stock is insufficient.
   */
  async decrementVariantStock(id: number, quantity: number) {
    const [v] = await db
      .update(menuItemVariants)
      .set({
        stockCount: sql`${menuItemVariants.stockCount} - ${quantity}`,
      })
      .where(
        and(
          eq(menuItemVariants.id, id),
          sql`${menuItemVariants.stockCount} IS NOT NULL AND ${menuItemVariants.stockCount} >= ${quantity}`,
        ),
      )
      .returning();
    return v || null;
  }

  /**
   * Atomically increment stock for a variant.
   * Only applies to tracked stock (stockCount IS NOT NULL).
   */
  async incrementVariantStock(id: number, quantity: number) {
    const [v] = await db
      .update(menuItemVariants)
      .set({
        stockCount: sql`${menuItemVariants.stockCount} + ${quantity}`,
      })
      .where(
        and(
          eq(menuItemVariants.id, id),
          sql`${menuItemVariants.stockCount} IS NOT NULL`,
        ),
      )
      .returning();
    return v || null;
  }

  /** Auto-mark variant as sold out when stock hits zero. */
  async markVariantSoldOutIfZero(id: number) {
    const [v] = await db
      .update(menuItemVariants)
      .set({ isSoldOut: true })
      .where(
        and(
          eq(menuItemVariants.id, id),
          sql`${menuItemVariants.stockCount} IS NOT NULL AND ${menuItemVariants.stockCount} <= 0`,
        ),
      )
      .returning();
    return v || null;
  }

  // --- Full menu ---
  async getFullMenu(restaurantId: number, options?: { hideSoldOut?: boolean }) {
    const categories = await db
      .select()
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.restaurantId, restaurantId),
          eq(menuCategories.isActive, true),
        ),
      )
      .orderBy(menuCategories.displayOrder);

    const items = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, restaurantId),
          eq(menuItems.isActive, true),
        ),
      );

    // Filter out sold-out items when serving the public menu
    const filteredItems = options?.hideSoldOut
      ? items.filter((item) => !item.isSoldOut)
      : items;

    const itemIds = filteredItems.map((i) => i.id);
    let variants: any[] = [];
    if (itemIds.length > 0) {
      // Fetch all variants for active items
      const allVariants = await db.select().from(menuItemVariants);
      variants = allVariants.filter(
        (v) => itemIds.includes(v.menuItemId) && v.isActive && (options?.hideSoldOut ? !v.isSoldOut : true),
      );
    }

    return categories.map((cat) => ({
      ...cat,
      items: filteredItems
        .filter((item) => item.categoryId === cat.id)
        .map((item) => ({
          ...item,
          variants: variants.filter((v) => v.menuItemId === item.id),
        })),
    }));
  }
}

export const menuRepository = new MenuRepository();
