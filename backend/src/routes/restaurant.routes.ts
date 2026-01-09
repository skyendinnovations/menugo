import { Router, Request, Response, NextFunction } from "express";
import { restaurantController } from "../controllers/restaurant.controller";

const router = Router();

// Simple request validator for creating restaurants
function validateRestaurant(req: Request, res: Response, next: NextFunction) {
  const { name, workflowSettings } = req.body || {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ success: false, message: "Invalid or missing 'name'" });
  }
  if (workflowSettings !== undefined) {
    if (typeof workflowSettings !== "object" || Array.isArray(workflowSettings)) {
      return res.status(400).json({ success: false, message: "Invalid 'workflowSettings'" });
    }
    if ("hasKitchenView" in workflowSettings && typeof workflowSettings.hasKitchenView !== "boolean") {
      return res.status(400).json({ success: false, message: "Invalid 'workflowSettings.hasKitchenView'" });
    }
    if ("orderFlow" in workflowSettings && !Array.isArray(workflowSettings.orderFlow)) {
      return res.status(400).json({ success: false, message: "Invalid 'workflowSettings.orderFlow'" });
    }
  }
  next();
}

router.post(
  "/",
  validateRestaurant,
  restaurantController.createRestaurant.bind(restaurantController)
);

router.get(
  "/:id",
  restaurantController.getRestaurantById.bind(restaurantController)
);

router.put(
  "/:id",
  restaurantController.updateRestaurant.bind(restaurantController)
);

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
