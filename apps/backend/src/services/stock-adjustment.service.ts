import { menuRepository } from "../repositories/menu.repository";
import { stockService } from "./stock.service";
import { AppError } from "../types";

/**
 * A single item submitted as part of an order — the minimal shape needed for
 * stock operations. Mirrors the `CreateOrderDTO.items` entries and the
 * `orderItems` rows that `voidOrder` / `updateOrderItem` provide.
 */
export interface StockItem {
  menuItemId: number;
  variantName?: string | null;
  quantity: number;
}

/**
 * Encapsulates all stock-mutation operations triggered by order lifecycle
 * events.  `OrderService` delegates every stock change here so its own methods
 * contain no stock loops.
 *
 * All methods are fire-and-forget-safe — they throw `AppError` on validation
 * failures but only emit SSE events / update DB counts; they never affect the
 * order row itself.
 */
class StockAdjustmentService {
  /**
   * Decrement stock for every item in a newly-placed order.
   *
   * Called immediately after the order row is created (non-blocking; caller
   * can `.catch()` to avoid blocking the order response).
   *
   * Items with `stockCount === null` (unlimited) are silently skipped.
   */
  async decrementForOrder(
    items: StockItem[],
    restaurantId: number,
  ): Promise<void> {
    for (const item of items) {
      const menuItem = await menuRepository.findItemById(item.menuItemId);
      if (!menuItem) continue;

      if (item.variantName) {
        const variants = await menuRepository.findVariantsByItem(
          item.menuItemId,
        );
        const variant = variants.find(
          (v) => v.name === item.variantName && v.isActive,
        );
        if (variant && variant.stockCount !== null) {
          await stockService
            .decrementVariantStock(
              variant.id,
              restaurantId,
              item.quantity,
              menuItem.name,
            )
            .catch(() => {
              // Non-fatal: stock will be slightly out of sync but the order is
              // already accepted. A background reconciliation job should handle this.
            });
        }
        continue;
      }

      if (menuItem.stockCount !== null) {
        await stockService
          .decrementItemStock(item.menuItemId, restaurantId, item.quantity)
          .catch(() => {});
      }
    }
  }

  /**
   * Restore stock for a list of voided / cancelled order items.
   *
   * Called when `voidOrder` cancels the order.  Awaited sequentially so the
   * stock counts are correct before the operation returns.
   */
  async restoreForItems(
    items: StockItem[],
    restaurantId: number,
  ): Promise<void> {
    for (const item of items) {
      const menuItem = await menuRepository.findItemById(item.menuItemId);
      if (!menuItem) continue;

      if (item.variantName) {
        const variants = await menuRepository.findVariantsByItem(
          item.menuItemId,
        );
        const variant = variants.find((v) => v.name === item.variantName);
        if (variant && variant.stockCount !== null) {
          await stockService.incrementVariantStock(
            variant.id,
            restaurantId,
            item.quantity,
            menuItem.name,
            variant.name,
          );
        }
        continue;
      }

      if (menuItem.stockCount !== null) {
        await stockService.incrementItemStock(
          menuItem.id,
          restaurantId,
          item.quantity,
          menuItem.name,
        );
      }
    }
  }

  /**
   * Adjust stock when an order item's quantity is changed before the order
   * reaches `ready` status.
   *
   * `diff = newQty − oldQty`:
   * - positive → decrement (more items ordered, check availability first)
   * - negative → increment (items removed, restore stock)
   * - zero     → no-op
   *
   * Throws `AppError(400, …)` when there is not enough stock for an increase.
   */
  async adjustForQuantityChange(
    item: StockItem & { oldQuantity: number; newQuantity: number },
    restaurantId: number,
  ): Promise<void> {
    const diff = item.newQuantity - item.oldQuantity;
    if (diff === 0) return;

    const menuItem = await menuRepository.findItemById(item.menuItemId);
    if (!menuItem) return;

    if (item.variantName) {
      const variants = await menuRepository.findVariantsByItem(item.menuItemId);
      const variant = variants.find((v) => v.name === item.variantName);
      if (!variant || variant.stockCount === null) return;

      if (diff > 0) {
        if (variant.stockCount < diff) {
          throw new AppError(
            400,
            `Insufficient stock for variant '${variant.name}': ${variant.stockCount} available, ${diff} requested`,
          );
        }
        await stockService.decrementVariantStock(
          variant.id,
          restaurantId,
          diff,
          menuItem.name,
        );
      } else {
        await stockService.incrementVariantStock(
          variant.id,
          restaurantId,
          Math.abs(diff),
          menuItem.name,
          variant.name,
        );
      }
      return;
    }

    if (menuItem.stockCount === null) return;

    if (diff > 0) {
      if (menuItem.stockCount < diff) {
        throw new AppError(
          400,
          `Insufficient stock for '${menuItem.name}': ${menuItem.stockCount} available, ${diff} requested`,
        );
      }
      await stockService.decrementItemStock(menuItem.id, restaurantId, diff);
    } else {
      await stockService.incrementItemStock(
        menuItem.id,
        restaurantId,
        Math.abs(diff),
        menuItem.name,
      );
    }
  }
}

export const stockAdjustmentService = new StockAdjustmentService();
