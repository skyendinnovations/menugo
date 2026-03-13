import { Router } from "express";
import { orderController } from "../controllers/order.controller";
import {
  requirePermission,
  requireAnyPermission,
} from "../middlewares/permission.middleware";
import { requireSubscription } from "../middlewares/subscription.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  orderParams,
  orderIdParams,
  orderItemParams,
  getOrdersQuery,
  updateOrderStatusBody,
  voidOrderBody,
  updateOrderItemBody,
} from "../validations";

const router = Router({ mergeParams: true });

// ── Purpose-built read endpoints ─────────────────────────────────────────────
// Each is scoped to a specific permission so that receiving a 403 means
// "you genuinely lack that permission", never "wrong endpoint".

/**
 * Kitchen kanban: received / preparing / ready orders with full items.
 * Requires: order_prepare
 */
router.get(
  "/kitchen",
  validate({ params: orderParams }),
  requireSubscription("professional"),
  requirePermission("order_prepare"),
  orderController.getKitchenOrders.bind(orderController),
);

/**
 * Delivery list: orders in the workflow-driven status that feeds "served".
 * Requires: order_deliver
 */
router.get(
  "/delivery",
  validate({ params: orderParams }),
  requireSubscription("professional"),
  requirePermission("order_deliver"),
  orderController.getDeliveryOrders.bind(orderController),
);

/**
 * Cashier view: active sessions with their non-cancelled orders,
 * grouped for the bill modal.
 * Requires: close_sessions
 */
router.get(
  "/cashier",
  validate({ params: orderParams }),
  requireSubscription("professional"),
  requirePermission("close_sessions"),
  orderController.getCashierOrders.bind(orderController),
);

/**
 * Orders overview: minimal fields, no items array.
 * Supports optional ?status= filter. Excludes terminal states by default.
 * Requires: view_orders
 */
router.get(
  "/overview",
  validate({ params: orderParams, query: getOrdersQuery }),
  requirePermission("view_orders"),
  orderController.getOrdersOverview.bind(orderController),
);

// ── Single-order endpoint ─────────────────────────────────────────────────────

/**
 * Fetch a single order with items.
 * Any member with at least one read-or-action permission may access.
 * The service enforces restaurant-ownership (cross-tenant guard).
 */
router.get(
  "/:orderId",
  validate({ params: orderIdParams }),
  requireAnyPermission(
    "view_orders",
    "order_prepare",
    "order_deliver",
    "close_sessions",
  ),
  orderController.getOrder.bind(orderController),
);

// ── Mutation endpoints ────────────────────────────────────────────────────────

/**
 * Advance or cancel an order's status.
 * view_orders is intentionally excluded — read-only users must not advance status.
 */
router.patch(
  "/:orderId/status",
  validate({ params: orderIdParams, body: updateOrderStatusBody }),
  requireAnyPermission("update_orders", "order_prepare", "order_deliver"),
  orderController.updateStatus.bind(orderController),
);

router.post(
  "/:orderId/accept",
  validate({ params: orderIdParams }),
  requireAnyPermission("update_orders", "order_prepare", "order_deliver"),
  orderController.acceptOrder.bind(orderController),
);

router.post(
  "/:orderId/claim",
  validate({ params: orderIdParams }),
  requireSubscription("professional"),
  requireAnyPermission("update_orders", "order_deliver"),
  orderController.claimOrder.bind(orderController),
);

router.post(
  "/:orderId/resend-notification",
  validate({ params: orderIdParams }),
  requireSubscription("professional"),
  requirePermission("resend_notification"),
  orderController.resendNotification.bind(orderController),
);

router.post(
  "/:orderId/void",
  validate({ params: orderIdParams, body: voidOrderBody }),
  requirePermission("modify_order"),
  orderController.voidOrder.bind(orderController),
);

router.put(
  "/:orderId/items/:itemId",
  validate({ params: orderItemParams, body: updateOrderItemBody }),
  requirePermission("modify_order"),
  orderController.updateOrderItem.bind(orderController),
);

export default router;
