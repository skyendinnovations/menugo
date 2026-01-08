import type {Request,Response,NextFunction } from "express";
import { restaurantService } from "../services/restaurant.service";

class RestaurantController {

    async createRestaurant(
        req: Request, res: Response, next: NextFunction) {
            try{
                const restaurant = await restaurantService.createRestaurant(req.body);

                return res.status(201).json({
                    success: true,
                    message: 'Restaurant created successfully',
                    data: restaurant
                });
            }catch(error){
                next(error);
            }
        }
}

export const restaurantController = new RestaurantController();