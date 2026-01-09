import type { Request, Response, NextFunction } from "express";
import { restaurantService } from "../services/restaurant.service";

class RestaurantController {
  async createRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurant = await restaurantService.createRestaurant(req.body);

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
      const restaurant = await restaurantService.updateRestaurant(
        Number(id),
        req.body
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
}

export const restaurantController = new RestaurantController();