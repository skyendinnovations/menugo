import { Router } from "express";
import { orderController } from "../controllers/order.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { requireSubscription } from "../middlewares/subscription.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  orderParams,
  orderIdParams,
  getOrdersQuery,
  updateOrderStatusBody,
} from "../validations";

const router = Router({ mergeParams: true });

router.get(
  "/",
  validate({ params: orderParams, query: getOrdersQuery }),
  requirePermission("view_orders"),
  orderController.getOrders.bind(orderController),
);

router.get(
  "/kitchen",
  validate({ params: orderParams }),
  requireSubscription("professional"),
  requirePermission("view_orders"),
  orderController.getKitchenOrders.bind(orderController),
);

router.get(
  "/waiter",
  validate({ params: orderParams }),
  requireSubscription("professional"),
  requirePermission("view_orders"),
  orderController.getWaiterOrders.bind(orderController),
);

router.get(
  "/:orderId",
  validate({ params: orderIdParams }),
  requirePermission("view_orders"),
  orderController.getOrder.bind(orderController),
);

router.patch(
  "/:orderId/status",
  validate({ params: orderIdParams, body: updateOrderStatusBody }),
  requirePermission("update_orders"),
  orderController.updateStatus.bind(orderController),
);

router.post(
  "/:orderId/accept",
  validate({ params: orderIdParams }),
  requirePermission("update_orders"),
  orderController.acceptOrder.bind(orderController),
);

export default router;
