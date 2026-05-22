import type { NextFunction, Request, Response } from "express";
import { kitchenService } from "../services/kitchen.service";
import { AppError } from "../types";

const parseNumericParam = (
  value: string | string[] | undefined,
  paramName: string,
): number => {
  if (!value || Array.isArray(value)) {
    throw new AppError(400, `Invalid ${paramName}: must be a number`);
  }
  const num = Number(value);
  if (isNaN(num)) {
    throw new AppError(400, `Invalid ${paramName}: must be a number`);
  }
  return num;
};

class KitchenController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = parseNumericParam(
        req.params.restaurantId,
        "restaurantId",
      );
      const data = await kitchenService.list(restaurantId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = parseNumericParam(
        req.params.restaurantId,
        "restaurantId",
      );
      const { name } = req.body;
      const data = await kitchenService.create(restaurantId, name);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseNumericParam(req.params.kitchenId, "kitchenId");
      const data = await kitchenService.update(id, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseNumericParam(req.params.kitchenId, "kitchenId");
      await kitchenService.delete(id);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const kitchenId = parseNumericParam(req.params.kitchenId, "kitchenId");
      const { userId } = req.body;
      const data = await kitchenService.addMember(kitchenId, userId);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const kitchenId = parseNumericParam(req.params.kitchenId, "kitchenId");
      const userId = req.params.userId;
      if (!userId || Array.isArray(userId)) {
        throw new AppError(400, "Invalid userId: must be a string");
      }
      await kitchenService.removeMember(kitchenId, userId);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
}

export const kitchenController = new KitchenController();
