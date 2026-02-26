import type { Request, Response, NextFunction } from "express";
import { availabilityService } from "../services/availability.service";

class AvailabilityController {
  async clockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const userId = req.user!.id;
      const result = await availabilityService.clockIn(userId, restaurantId);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async clockOut(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const userId = req.user!.id;
      const result = await availabilityService.clockOut(userId, restaurantId);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const result = await availabilityService.getAvailability(restaurantId);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const availabilityController = new AvailabilityController();
