import type { Request, Response, NextFunction } from "express";
import { restaurantService } from "../services/restaurant.service";
import { restaurantRepository } from "../repositories/restaurant.repository";
import { demoService } from "../services/demo.service";

class RestaurantController {
  async createRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const restaurant = await restaurantService.createRestaurant(
        userId,
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: "Restaurant created successfully",
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRestaurantById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ success: false, message: "Invalid id" });
      }
      const restaurant = await restaurantService.getRestaurantById(Number(id));
      return res.status(200).json({
        success: true,
        message: "Restaurant retrieved successfully",
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRestaurants(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }
      const restaurants = await restaurantService.getAllRestaurants(userId);
      return res.status(200).json({
        success: true,
        message: "Restaurants retrieved successfully",
        data: restaurants,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ success: false, message: "Invalid id" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      // ensure restaurant exists
      let target;
      try {
        target = await restaurantService.getRestaurantById(Number(id));
      } catch (err) {
        return res
          .status(404)
          .json({ success: false, message: "Restaurant not found" });
      }

      const ownerId = await restaurantService.getOwnerByRestaurantId(
        Number(id),
      );
      if (ownerId && ownerId !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const restaurant = await restaurantService.updateRestaurant(
        Number(id),
        req.body,
      );
      return res.status(200).json({
        success: true,
        message: "Restaurant updated successfully",
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ success: false, message: "Invalid id" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      // ensure restaurant exists
      try {
        await restaurantService.getRestaurantById(Number(id));
      } catch (err) {
        return res
          .status(404)
          .json({ success: false, message: "Restaurant not found" });
      }

      const ownerId = await restaurantService.getOwnerByRestaurantId(
        Number(id),
      );
      if (ownerId && ownerId !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const result = await restaurantService.deleteRestaurant(Number(id));
      return res.status(200).json({
        success: true,
        message: "Restaurant deleted successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // async getMyRestaurants(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const userId = req.user!.id;
  //     console.log(userId);
  //     const restaurants = await restaurantService.getMyRestaurants(userId);
  //     return res.status(200).json({
  //       success: true,
  //       message: "My Restaurants retrieved successfully",
  //       data: restaurants,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  async updateWorkflowMode(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id || !/^\d+$/.test(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid id" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      // Ensure restaurant exists
      try {
        await restaurantService.getRestaurantById(Number(id));
      } catch {
        return res
          .status(404)
          .json({ success: false, message: "Restaurant not found" });
      }

      // Only owner can change workflow mode
      const ownerId = await restaurantService.getOwnerByRestaurantId(
        Number(id),
      );
      if (ownerId && ownerId !== userId) {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden" });
      }

      const { workflowMode } = req.body;
      const restaurant = await restaurantRepository.updateWorkflowMode(
        Number(id),
        workflowMode,
      );
      return res.json({
        success: true,
        message: "Workflow mode updated",
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleDemoMode(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || !/^\d+$/.test(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid id" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      // Only owner can toggle demo mode
      const ownerId = await restaurantService.getOwnerByRestaurantId(
        Number(id),
      );
      if (ownerId && ownerId !== userId) {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden" });
      }

      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res
          .status(400)
          .json({ success: false, message: "enabled (boolean) is required" });
      }

      const restaurant = await demoService.toggleDemoMode(Number(id), enabled);
      return res.json({
        success: true,
        message: enabled
          ? "Training mode enabled"
          : "Training mode disabled",
        data: restaurant,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetDemoData(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id || !/^\d+$/.test(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid id" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      // Only owner can reset demo data
      const ownerId = await restaurantService.getOwnerByRestaurantId(
        Number(id),
      );
      if (ownerId && ownerId !== userId) {
        return res
          .status(403)
          .json({ success: false, message: "Forbidden" });
      }

      const result = await demoService.resetDemoData(Number(id));
      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const restaurantController = new RestaurantController();
