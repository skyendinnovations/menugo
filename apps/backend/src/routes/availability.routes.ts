import { Router } from "express";
import { availabilityController } from "../controllers/availability.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { availabilityParams } from "../validations";

const router = Router({ mergeParams: true });

// POST /restaurants/:restaurantId/staff/clock-in
router.post(
  "/clock-in",
  validate({ params: availabilityParams }),
  requirePermission("view_orders"),
  availabilityController.clockIn.bind(availabilityController),
);

// POST /restaurants/:restaurantId/staff/clock-out
router.post(
  "/clock-out",
  validate({ params: availabilityParams }),
  requirePermission("view_orders"),
  availabilityController.clockOut.bind(availabilityController),
);

// GET /restaurants/:restaurantId/staff/availability
router.get(
  "/availability",
  validate({ params: availabilityParams }),
  requirePermission("view_orders"),
  availabilityController.getAvailability.bind(availabilityController),
);

export default router;
