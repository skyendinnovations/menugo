import type { Request, Response, NextFunction } from "express";
import { stockService } from "../services/stock.service";

/** Extract audit context from Express request. */
function auditCtx(req: Request) {
  return {
    actorUserId: req.user!.id,
    ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null,
  };
}

class StockController {
  // ─── Item stock ───────────────────────────────────────────────────

  async setItemStock(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const itemId = Number(req.params.itemId);
      const { stockCount } = req.body;

      const item = await stockService.setItemStock(
        itemId,
        restaurantId,
        stockCount,
        auditCtx(req),
      );
      return res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async toggleItemSoldOut(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const itemId = Number(req.params.itemId);
      const { isSoldOut } = req.body;

      const item = await stockService.toggleItemSoldOut(
        itemId,
        restaurantId,
        isSoldOut,
        auditCtx(req),
      );
      return res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  // ─── Variant stock ────────────────────────────────────────────────

  async setVariantStock(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const variantId = Number(req.params.variantId);
      const { stockCount } = req.body;

      const variant = await stockService.setVariantStock(
        variantId,
        restaurantId,
        stockCount,
        auditCtx(req),
      );
      return res.json({ success: true, data: variant });
    } catch (error) {
      next(error);
    }
  }

  async toggleVariantSoldOut(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const variantId = Number(req.params.variantId);
      const { isSoldOut } = req.body;

      const variant = await stockService.toggleVariantSoldOut(
        variantId,
        restaurantId,
        isSoldOut,
        auditCtx(req),
      );
      return res.json({ success: true, data: variant });
    } catch (error) {
      next(error);
    }
  }
}

export const stockController = new StockController();
