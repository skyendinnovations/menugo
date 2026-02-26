import { Router } from "express";
import { publicController } from "../controllers/public.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  slugParam,
  slugTableParam,
  publicSessionIdParam,
  tableInfoQuery,
  createSessionBody,
  joinSessionBody,
  placeOrderBody,
} from "../validations";

// NO auth middleware on these routes
const router = Router();

// Get restaurant menu
router.get(
  "/:slug/menu",
  validate({ params: slugParam }),
  publicController.getMenu.bind(publicController),
);

// Get table info (capacity, occupied seats, availability)
router.get(
  "/:slug/:tableNumber/info",
  validate({ params: slugTableParam, query: tableInfoQuery }),
  publicController.getTableInfo.bind(publicController),
);

// Create or get session for a table
router.post(
  "/:slug/:tableNumber/session",
  validate({ params: slugTableParam, body: createSessionBody }),
  publicController.createOrGetSession.bind(publicController),
);

// Join existing session via code
router.post(
  "/session/join",
  validate({ body: joinSessionBody }),
  publicController.joinSession.bind(publicController),
);

// Get session status
router.get(
  "/session/:sessionId",
  validate({ params: publicSessionIdParam }),
  publicController.getSessionStatus.bind(publicController),
);

// Place order
router.post(
  "/session/:sessionId/order",
  validate({ params: publicSessionIdParam, body: placeOrderBody }),
  publicController.placeOrder.bind(publicController),
);

// Get session orders
router.get(
  "/session/:sessionId/orders",
  validate({ params: publicSessionIdParam }),
  publicController.getSessionOrders.bind(publicController),
);

// Register customer device FCM token (self-service workflow)
router.post(
  "/register-device-token",
  publicController.registerDeviceToken.bind(publicController),
);

export default router;
