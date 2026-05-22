import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import {
  menuCategories,
  menuItems,
  menuItemVariants,
  kitchenMenuItems,
} from "@menugo/data/schemas";
import type { CreateMenuItemDTO, UpdateMenuItemDTO } from "@menugo/dto";

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

  async createItem(data: CreateMenuItemDTO & { restaurantId: number }) {
    const { kitchenId, ...itemData } = data;
    
    const result = await db.transaction(async (tx) => {
      const [item] = await tx.insert(menuItems).values(itemData).returning();
      if (item && kitchenId) {
        await tx.insert(kitchenMenuItems).values({ kitchenId, menuItemId: item.id });
      }
      return item;
    });
    
    return result;
  }

  async updateItem(
    id: number,
    data: UpdateMenuItemDTO,
  ) {
    const { kitchenId, ...itemData } = data;
    
    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .update(menuItems)
        .set({ ...itemData, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning();
      
      if (typeof kitchenId !== "undefined") {
        await tx.delete(kitchenMenuItems).where(eq(kitchenMenuItems.menuItemId, id));
        if (kitchenId) {
          await tx.insert(kitchenMenuItems).values({ kitchenId, menuItemId: id });
        }
      }
      
      return item;
    });
    
    return result;
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

  // --- Full menu ---
  async getFullMenu(restaurantId: number) {
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

    const itemIds = items.map((i) => i.id);
    let variants: any[] = [];
    if (itemIds.length > 0) {
      // Fetch all variants for active items
      const allVariants = await db.select().from(menuItemVariants);
      variants = allVariants.filter(
        (v) => itemIds.includes(v.menuItemId) && v.isActive,
      );
    }

    return categories.map((cat) => ({
      ...cat,
      items: items
        .filter((item) => item.categoryId === cat.id)
        .map((item) => ({
          ...item,
          variants: variants.filter((v) => v.menuItemId === item.id),
        })),
    }));
  }
}

export const menuRepository = new MenuRepository();
