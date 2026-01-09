import type { Request, Response, NextFunction } from "express";
import { restaurantService } from "../services/restaurant.service";

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

      const restaurant = await restaurantService.createRestaurant(userId, req.body);

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
      const restaurants = await restaurantService.getAllRestaurants();
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
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      // ensure restaurant exists
      let target;
      try {
        target = await restaurantService.getRestaurantById(Number(id));
      } catch (err) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      const ownerId = await restaurantService.getOwnerByRestaurantId(Number(id));
      if (ownerId && ownerId !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      const restaurant = await restaurantService.updateRestaurant(Number(id), req.body);
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
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      // ensure restaurant exists
      try {
        await restaurantService.getRestaurantById(Number(id));
      } catch (err) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      const ownerId = await restaurantService.getOwnerByRestaurantId(Number(id));
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
}

export const restaurantController = new RestaurantController();