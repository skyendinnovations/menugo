import { Router } from "express";
import { restaurantController } from "../controllers/restaurant.controller";

const router = Router();

router.post(
  "/",
  restaurantController.createRestaurant.bind(restaurantController)
);

router.get(
  "/:id",
  restaurantController.getRestaurantById.bind(restaurantController)
);

router.put(
  "/:id",
  restaurantController.updateRestaurant.bind(restaurantController)
)

router.get("/", restaurantController.getRestaurants.bind(restaurantController));

router.delete(
  "/:id",
  restaurantController.deleteRestaurant.bind(restaurantController)
);

// router.get(
//   "/my-restaurants",
//   restaurantController.getMyRestaurants.bind(restaurantController)
// );
export default router;
