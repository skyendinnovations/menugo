import { menuRepository } from "../repositories/menu.repository";
import { auditService } from "./audit.service";
import { eventBus } from "./event-bus.service";
import { AppError } from "../types";
import { logger } from "../utils/logger";

/** Contextual info passed from the controller for audit logging. */
interface AuditContext {
  actorUserId: string;
  ipAddress?: string;
}

class StockService {
  // ─── Item-level stock ─────────────────────────────────────────────

  /**
   * Set stock count for a menu item.
   * Pass `null` for unlimited stock.
   */
  async setItemStock(
    itemId: number,
    restaurantId: number,
    stockCount: number | null,
    ctx?: AuditContext,
  ) {
    const item = await menuRepository.findItemById(itemId);
    if (!item) throw new AppError(404, "Menu item not found");
    if (item.restaurantId !== restaurantId) {
      throw new AppError(403, "Item does not belong to this restaurant");
    }

    const oldStockCount = item.stockCount;
    const oldSoldOut = item.isSoldOut;
    const updated = await menuRepository.updateItemStock(itemId, stockCount);
    if (!updated) throw new AppError(500, "Failed to update stock");

    // Audit log
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "stock_updated",
          entityType: "menu_item",
          entityId: itemId,
          oldValue: { stockCount: oldStockCount, isSoldOut: oldSoldOut },
          newValue: {
            stockCount: updated.stockCount,
            isSoldOut: updated.isSoldOut,
          },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit SSE event
    eventBus.emit(restaurantId, "stock_updated", {
      menuItemId: itemId,
      itemName: item.name,
      stockCount: updated.stockCount,
      isSoldOut: updated.isSoldOut ?? false,
    });

    // If sold out, also emit availability changed
    if (updated.isSoldOut && !oldSoldOut) {
      eventBus.emit(restaurantId, "menu_availability_changed", {
        menuItemId: itemId,
        itemName: item.name,
        isAvailable: false,
        categoryId: item.categoryId,
      });
    }

    return updated;
  }

  /**
   * Toggle sold-out status for a menu item.
   */
  async toggleItemSoldOut(
    itemId: number,
    restaurantId: number,
    isSoldOut: boolean,
    ctx?: AuditContext,
  ) {
    const item = await menuRepository.findItemById(itemId);
    if (!item) throw new AppError(404, "Menu item not found");
    if (item.restaurantId !== restaurantId) {
      throw new AppError(403, "Item does not belong to this restaurant");
    }

    const oldSoldOut = item.isSoldOut;
    const updated = await menuRepository.toggleItemSoldOut(itemId, isSoldOut);
    if (!updated) throw new AppError(500, "Failed to toggle sold-out status");

    // Audit log
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "stock_updated",
          entityType: "menu_item",
          entityId: itemId,
          oldValue: { isSoldOut: oldSoldOut },
          newValue: { isSoldOut: updated.isSoldOut },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit SSE events
    eventBus.emit(restaurantId, "stock_updated", {
      menuItemId: itemId,
      itemName: item.name,
      stockCount: updated.stockCount,
      isSoldOut: updated.isSoldOut ?? false,
    });

    eventBus.emit(restaurantId, "menu_availability_changed", {
      menuItemId: itemId,
      itemName: item.name,
      isAvailable: updated.isAvailable ?? false,
      categoryId: item.categoryId,
    });

    return updated;
  }

  // ─── Variant-level stock ──────────────────────────────────────────

  /**
   * Set stock count for a menu item variant.
   * Pass `null` for unlimited stock.
   */
  async setVariantStock(
    variantId: number,
    restaurantId: number,
    stockCount: number | null,
    ctx?: AuditContext,
  ) {
    const variant = await menuRepository.findVariantById(variantId);
    if (!variant) throw new AppError(404, "Variant not found");

    // Verify the parent item belongs to the restaurant
    const item = await menuRepository.findItemById(variant.menuItemId);
    if (!item || item.restaurantId !== restaurantId) {
      throw new AppError(403, "Variant does not belong to this restaurant");
    }

    const oldStockCount = variant.stockCount;
    const oldSoldOut = variant.isSoldOut;
    const updated = await menuRepository.updateVariantStock(
      variantId,
      stockCount,
    );
    if (!updated) throw new AppError(500, "Failed to update variant stock");

    // Audit log
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "stock_updated",
          entityType: "menu_variant",
          entityId: variantId,
          oldValue: { stockCount: oldStockCount, isSoldOut: oldSoldOut },
          newValue: {
            stockCount: updated.stockCount,
            isSoldOut: updated.isSoldOut,
          },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit SSE event
    eventBus.emit(restaurantId, "stock_updated", {
      menuItemId: item.id,
      itemName: item.name,
      variantId,
      variantName: variant.name,
      stockCount: updated.stockCount,
      isSoldOut: updated.isSoldOut ?? false,
    });

    return updated;
  }

  /**
   * Toggle sold-out status for a variant.
   */
  async toggleVariantSoldOut(
    variantId: number,
    restaurantId: number,
    isSoldOut: boolean,
    ctx?: AuditContext,
  ) {
    const variant = await menuRepository.findVariantById(variantId);
    if (!variant) throw new AppError(404, "Variant not found");

    const item = await menuRepository.findItemById(variant.menuItemId);
    if (!item || item.restaurantId !== restaurantId) {
      throw new AppError(403, "Variant does not belong to this restaurant");
    }

    const oldSoldOut = variant.isSoldOut;
    const updated = await menuRepository.toggleVariantSoldOut(
      variantId,
      isSoldOut,
    );
    if (!updated) throw new AppError(500, "Failed to toggle variant sold-out");

    // Audit log
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "stock_updated",
          entityType: "menu_variant",
          entityId: variantId,
          oldValue: { isSoldOut: oldSoldOut },
          newValue: { isSoldOut: updated.isSoldOut },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit SSE event
    eventBus.emit(restaurantId, "stock_updated", {
      menuItemId: item.id,
      itemName: item.name,
      variantId,
      variantName: variant.name,
      stockCount: updated.stockCount,
      isSoldOut: updated.isSoldOut ?? false,
    });

    return updated;
  }

  // ─── Internal: Stock decrement on order placement ─────────────────

  /**
   * Decrement stock for a menu item during order placement.
   * Throws if stock is insufficient.
   * Auto-marks as sold-out when stock reaches zero.
   */
  async decrementItemStock(
    itemId: number,
    restaurantId: number,
    quantity: number,
  ) {
    const decremented = await menuRepository.decrementItemStock(
      itemId,
      quantity,
    );
    if (!decremented) {
      const item = await menuRepository.findItemById(itemId);
      const available = item?.stockCount ?? 0;
      throw new AppError(
        400,
        `Insufficient stock for '${item?.name ?? itemId}': ${available} available, ${quantity} requested`,
      );
    }

    // Auto-sold-out check
    if (decremented.stockCount !== null && decremented.stockCount <= 0) {
      const soldOut = await menuRepository.markSoldOutIfZero(itemId);
      if (soldOut) {
        logger.info(`Item ${itemId} auto-marked sold out (stock reached 0)`);
        eventBus.emit(restaurantId, "stock_updated", {
          menuItemId: itemId,
          itemName: decremented.name,
          stockCount: 0,
          isSoldOut: true,
        });
        eventBus.emit(restaurantId, "menu_availability_changed", {
          menuItemId: itemId,
          itemName: decremented.name,
          isAvailable: false,
          categoryId: decremented.categoryId,
        });
      }
    }

    return decremented;
  }

  /**
   * Increment stock for a menu item (used on void or item reduction).
   * No-op for unlimited stock.
   */
  async incrementItemStock(
    itemId: number,
    restaurantId: number,
    quantity: number,
    itemName: string,
  ) {
    const incremented = await menuRepository.incrementItemStock(
      itemId,
      quantity,
    );
    if (!incremented) return null;

    // If item was sold out, consider flipping availability back on
    if (incremented.isSoldOut && incremented.stockCount && incremented.stockCount > 0) {
      await menuRepository.toggleItemSoldOut(itemId, false);
    }

    eventBus.emit(restaurantId, "stock_updated", {
      menuItemId: itemId,
      itemName,
      stockCount: incremented.stockCount,
      isSoldOut: incremented.isSoldOut ?? false,
    });

    return incremented;
  }

  /**
   * Decrement stock for a variant during order placement.
   * Throws if stock is insufficient.
   * Auto-marks as sold-out when stock reaches zero.
   */
  async decrementVariantStock(
    variantId: number,
    restaurantId: number,
    quantity: number,
    parentItemName: string,
  ) {
    const decremented = await menuRepository.decrementVariantStock(
      variantId,
      quantity,
    );
    if (!decremented) {
      const variant = await menuRepository.findVariantById(variantId);
      const available = variant?.stockCount ?? 0;
      throw new AppError(
        400,
        `Insufficient stock for variant '${variant?.name ?? variantId}': ${available} available, ${quantity} requested`,
      );
    }

    // Auto-sold-out check
    if (decremented.stockCount !== null && decremented.stockCount <= 0) {
      const soldOut = await menuRepository.markVariantSoldOutIfZero(variantId);
      if (soldOut) {
        logger.info(
          `Variant ${variantId} auto-marked sold out (stock reached 0)`,
        );
        eventBus.emit(restaurantId, "stock_updated", {
          menuItemId: decremented.menuItemId,
          itemName: parentItemName,
          variantId,
          variantName: decremented.name,
          stockCount: 0,
          isSoldOut: true,
        });
      }
    }

    return decremented;
  }

  /**
   * Increment stock for a menu variant (used on void or item reduction).
   * No-op for unlimited stock.
   */
  async incrementVariantStock(
    variantId: number,
    restaurantId: number,
    quantity: number,
    parentItemName: string,
    variantName: string,
  ) {
    const incremented = await menuRepository.incrementVariantStock(
      variantId,
      quantity,
    );
    if (!incremented) return null;

    if (incremented.isSoldOut && incremented.stockCount && incremented.stockCount > 0) {
      await menuRepository.toggleVariantSoldOut(variantId, false);
    }

    eventBus.emit(restaurantId, "stock_updated", {
      menuItemId: incremented.menuItemId,
      itemName: parentItemName,
      variantId,
      variantName,
      stockCount: incremented.stockCount,
      isSoldOut: incremented.isSoldOut ?? false,
    });

    return incremented;
  }
}

export const stockService = new StockService();
