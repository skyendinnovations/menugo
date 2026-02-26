import type { Request, Response, NextFunction } from "express";
import { menuService } from "../services/menu.service";

/** Extract audit context from Express request. */
function auditCtx(req: Request) {
  return {
    actorUserId: req.user!.id,
    ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null,
  };
}

class MenuController {
  // --- Categories ---
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const categories = await menuService.getCategories(restaurantId);
      return res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { name, displayOrder } = req.body;
      if (!name || typeof name !== "string") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid name" });
      }
      const cat = await menuService.createCategory(restaurantId, {
        name,
        displayOrder,
      });
      return res.status(201).json({ success: true, data: cat });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.categoryId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid category ID" });
      }
      const cat = await menuService.updateCategory(id, req.body);
      return res.json({ success: true, data: cat });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.categoryId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid category ID" });
      }
      await menuService.deleteCategory(id);
      return res.json({ success: true, message: "Category deleted" });
    } catch (error) {
      next(error);
    }
  }

  // --- Items ---
  async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = Number(req.params.categoryId);
      if (!categoryId || isNaN(categoryId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid category ID" });
      }
      const items = await menuService.getItemsByCategory(categoryId);
      return res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  async getItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.itemId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid item ID" });
      }
      const item = await menuService.getItemById(id);
      return res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { categoryId, name, price } = req.body;
      if (!name || typeof name !== "string") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid name" });
      }
      if (!price) {
        return res
          .status(400)
          .json({ success: false, message: "Price required" });
      }
      if (!categoryId) {
        return res
          .status(400)
          .json({ success: false, message: "categoryId required" });
      }
      const item = await menuService.createItem(restaurantId, req.body);
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.itemId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid item ID" });
      }
      const item = await menuService.updateItem(id, req.body);
      return res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async toggleAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.itemId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid item ID" });
      }
      const item = await menuService.toggleAvailability(id, auditCtx(req));
      return res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  }

  async deleteItem(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.itemId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid item ID" });
      }
      await menuService.deleteItem(id);
      return res.json({ success: true, message: "Item deleted" });
    } catch (error) {
      next(error);
    }
  }

  // --- Variants ---
  async createVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const itemId = Number(req.params.itemId);
      const { name, price } = req.body;
      if (!name || !price) {
        return res
          .status(400)
          .json({ success: false, message: "Name and price required" });
      }
      const variant = await menuService.createVariant(itemId, { name, price });
      return res.status(201).json({ success: true, data: variant });
    } catch (error) {
      next(error);
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.variantId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid variant ID" });
      }
      const variant = await menuService.updateVariant(id, req.body);
      return res.json({ success: true, data: variant });
    } catch (error) {
      next(error);
    }
  }

  async deleteVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.variantId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid variant ID" });
      }
      await menuService.deleteVariant(id);
      return res.json({ success: true, message: "Variant deleted" });
    } catch (error) {
      next(error);
    }
  }
}

export const menuController = new MenuController();
