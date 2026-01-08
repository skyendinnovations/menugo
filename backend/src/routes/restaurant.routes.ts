import { Router } from "express";
import { restaurantController } from "../controllers/restaurant.controller";


const router =  Router();

router.post('/', restaurantController.createRestaurant.bind(restaurantController));

export default router;