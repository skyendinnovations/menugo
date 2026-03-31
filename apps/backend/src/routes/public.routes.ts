import { Router } from "express";
import { publicController } from "../controllers/public.controller";

// NO auth middleware on these routes
const router = Router();

// Get restaurant menu
router.get("/:slug/menu", publicController.getMenu.bind(publicController));

// Get table info (capacity, occupied seats, availability)
router.get("/:slug/:tableNumber/info", publicController.getTableInfo.bind(publicController));

// Create or get session for a table
router.post("/:slug/:tableNumber/session", publicController.createOrGetSession.bind(publicController));

// Join existing session via code
router.post("/session/join", publicController.joinSession.bind(publicController));

// Get session status
router.get("/session/:sessionId", publicController.getSessionStatus.bind(publicController));

// Place order
router.post("/session/:sessionId/order", publicController.placeOrder.bind(publicController));

// Get session orders
router.get("/session/:sessionId/orders", publicController.getSessionOrders.bind(publicController));

// Register customer FCM token (for order update push notifications)
router.post("/session/:sessionId/register-device", publicController.registerCustomerDevice.bind(publicController));

export default router;

