import { Router } from "express";
import { orderController } from "../controllers/order.controller";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requirePermission("view_orders"),
  orderController.getOrders.bind(orderController),
);

router.get(
  "/kitchen",
  requirePermission("view_orders"),
  orderController.getKitchenOrders.bind(orderController),
);

router.get(
  "/waiter",
  requirePermission("view_orders"),
  orderController.getWaiterOrders.bind(orderController),
);

router.get(
  "/:orderId",
  requirePermission("view_orders"),
  orderController.getOrder.bind(orderController),
);

router.patch(
  "/:orderId/status",
  requirePermission("update_orders"),
  orderController.updateStatus.bind(orderController),
);

router.post(
  "/:orderId/accept",
  requirePermission("update_orders"),
  orderController.acceptOrder.bind(orderController),
);

export default router;
