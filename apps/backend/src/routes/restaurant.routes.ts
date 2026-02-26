import { Router } from "express";
import { restaurantController } from "../controllers/restaurant.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  createRestaurantBody,
  updateRestaurantBody,
  restaurantIdParam,
} from "../validations";
import { updateWorkflowModeBody } from "../validations/workflow";

const router = Router();

router.post(
  "/",
  validate({ body: createRestaurantBody }),
  restaurantController.createRestaurant.bind(restaurantController),
);

router.get(
  "/:id",
  validate({ params: restaurantIdParam }),
  restaurantController.getRestaurantById.bind(restaurantController),
);

router.put(
  "/:id",
  validate({ params: restaurantIdParam, body: updateRestaurantBody }),
  restaurantController.updateRestaurant.bind(restaurantController),
);

router.get("/", restaurantController.getRestaurants.bind(restaurantController));

router.delete(
  "/:id",
  validate({ params: restaurantIdParam }),
  restaurantController.deleteRestaurant.bind(restaurantController),
);

router.put(
  "/:id/workflow-mode",
  validate({ params: restaurantIdParam, body: updateWorkflowModeBody }),
  restaurantController.updateWorkflowMode.bind(restaurantController),
);

export default router;
