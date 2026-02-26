import { menuRepository } from "../repositories/menu.repository";
import { auditService } from "./audit.service";
import { eventBus } from "./event-bus.service";
import { AppError } from "../types";
import type {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CreateMenuItemDTO,
  UpdateMenuItemDTO,
  CreateVariantDTO,
  UpdateVariantDTO,
} from "@menugo/dto";

/** Contextual info passed from the controller for audit logging. */
interface AuditContext {
  actorUserId: string;
  ipAddress?: string;
}

class MenuService {
  // --- Categories ---
  async getCategories(restaurantId: number) {
    return menuRepository.findCategoriesByRestaurant(restaurantId);
  }

  async createCategory(restaurantId: number, dto: CreateCategoryDTO) {
    return menuRepository.createCategory(
      restaurantId,
      dto.name,
      dto.displayOrder,
    );
  }

  async updateCategory(id: number, dto: UpdateCategoryDTO) {
    const cat = await menuRepository.findCategoryById(id);
    if (!cat) throw new AppError(404, "Category not found");
    return menuRepository.updateCategory(id, dto);
  }

  async deleteCategory(id: number) {
    const cat = await menuRepository.findCategoryById(id);
    if (!cat) throw new AppError(404, "Category not found");
    return menuRepository.deleteCategory(id);
  }

  // --- Items ---
  async getItemsByCategory(categoryId: number) {
    return menuRepository.findItemsByCategory(categoryId);
  }

  async getItemById(id: number) {
    const item = await menuRepository.findItemById(id);
    if (!item) throw new AppError(404, "Menu item not found");

    const variants = await menuRepository.findVariantsByItem(id);
    return { ...item, variants };
  }

  async createItem(restaurantId: number, dto: CreateMenuItemDTO) {
    const category = await menuRepository.findCategoryById(dto.categoryId);
    if (!category) throw new AppError(404, "Category not found");
    if (category.restaurantId !== restaurantId) {
      throw new AppError(400, "Category does not belong to this restaurant");
    }

    const createdItem = await menuRepository.createItem({
      restaurantId,
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      isVeg: dto.isVeg,
      imagePath: dto.imagePath,
      hasVariants: dto.hasVariants,
    });

    if (!createdItem) throw new AppError(500, "Failed to create menu item");

    // Create variants if provided
    if (dto.variants && dto.variants.length > 0) {
      for (const v of dto.variants) {
        await menuRepository.createVariant(createdItem.id, v.name, v.price);
      }
    }

    const variants = await menuRepository.findVariantsByItem(createdItem.id);
    return { ...createdItem, variants };
  }

  async updateItem(id: number, dto: UpdateMenuItemDTO) {
    const item = await menuRepository.findItemById(id);
    if (!item) throw new AppError(404, "Menu item not found");
    return menuRepository.updateItem(id, dto);
  }

  async toggleAvailability(id: number, ctx?: AuditContext) {
    const item = await menuRepository.toggleAvailability(id);
    if (!item) throw new AppError(404, "Menu item not found");

    if (ctx) {
      auditService
        .log({
          restaurantId: item.restaurantId,
          actorUserId: ctx.actorUserId,
          action: "menu_availability_changed",
          entityType: "menu_item",
          entityId: id,
          // toggleAvailability flipped the value, so old is the inverse
          oldValue: { isAvailable: !item.isAvailable },
          newValue: { isAvailable: item.isAvailable },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit real-time event for SSE / polling clients
    eventBus.emit(item.restaurantId, "menu_availability_changed", {
      menuItemId: id,
      itemName: item.name,
      isAvailable: item.isAvailable ?? false,
      categoryId: item.categoryId,
    });

    return item;
  }

  async deleteItem(id: number) {
    const item = await menuRepository.findItemById(id);
    if (!item) throw new AppError(404, "Menu item not found");
    return menuRepository.deleteItem(id);
  }

  // --- Variants ---
  async createVariant(menuItemId: number, dto: CreateVariantDTO) {
    const item = await menuRepository.findItemById(menuItemId);
    if (!item) throw new AppError(404, "Menu item not found");
    return menuRepository.createVariant(menuItemId, dto.name, dto.price);
  }

  async updateVariant(id: number, dto: UpdateVariantDTO) {
    const variant = await menuRepository.findVariantById(id);
    if (!variant) throw new AppError(404, "Variant not found");
    return menuRepository.updateVariant(id, dto);
  }

  async deleteVariant(id: number) {
    const variant = await menuRepository.findVariantById(id);
    if (!variant) throw new AppError(404, "Variant not found");
    return menuRepository.deleteVariant(id);
  }

  // --- Full menu (public) ---
  async getFullMenu(restaurantId: number) {
    return menuRepository.getFullMenu(restaurantId);
  }

  /**
   * Public-facing menu: hides sold-out items and variants
   * so customers only see what's available.
   */
  async getPublicMenu(restaurantId: number) {
    return menuRepository.getFullMenu(restaurantId, { hideSoldOut: true });
  }
}

export const menuService = new MenuService();
