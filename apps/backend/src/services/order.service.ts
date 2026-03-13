import { orderRepository } from "../repositories/order.repository";
import { sessionRepository } from "../repositories/session.repository";
import { participantRepository } from "../repositories/participant.repository";
import { menuRepository } from "../repositories/menu.repository";
import { tableRepository } from "../repositories/table.repository";
import { notificationOrchestrator } from "./notification-orchestrator.service";
import { workflowService } from "./workflow.service";
import { availabilityService } from "./availability.service";
import { stockAdjustmentService } from "./stock-adjustment.service";
import { orderAuditService } from "./order-audit.service";
import { AppError } from "../types";
import type { AuditContext } from "../types";
import type {
  CreateOrderDTO,
  OrderStatusUpdate,
} from "@menugo/dto";
import { generateOrderNumber } from "../utils/order-number";

class OrderService {
  async createOrder(restaurantId: number, dto: CreateOrderDTO) {
    // Validate session
    const session = await sessionRepository.findById(dto.sessionId);
    if (!session) throw new AppError(404, "Session not found");
    if (session.status !== "active") {
      throw new AppError(400, "Session is not active");
    }
    if (session.restaurantId !== restaurantId) {
      throw new AppError(400, "Session does not belong to this restaurant");
    }

    // Validate device is a participant
    const participant = await participantRepository.findByDeviceAndSession(
      dto.deviceId,
      dto.sessionId,
    );
    if (!participant) {
      throw new AppError(403, "Device is not a participant of this session");
    }

    if (dto.items.length === 0) {
      throw new AppError(400, "Order must have at least one item");
    }

    // Validate items and snapshot prices
    const orderItemsData = [];
    for (const item of dto.items) {
      const menuItem = await menuRepository.findItemById(item.menuItemId);
      if (!menuItem) {
        throw new AppError(404, `Menu item ${item.menuItemId} not found`);
      }
      if (!menuItem.isAvailable || !menuItem.isActive) {
        throw new AppError(400, `${menuItem.name} is not available`);
      }
      if (menuItem.isSoldOut) {
        throw new AppError(400, `${menuItem.name} is sold out`);
      }

      // Check stock availability (null = unlimited)
      if (menuItem.stockCount !== null && menuItem.stockCount < item.quantity) {
        throw new AppError(
          400,
          `Insufficient stock for '${menuItem.name}': ${menuItem.stockCount} available, ${item.quantity} requested`,
        );
      }

      let price = menuItem.price;
      const variantName = item.variantName;

      // If variant is specified, validate and use variant price
      if (variantName) {
        const variants = await menuRepository.findVariantsByItem(
          item.menuItemId,
        );
        const variant = variants.find(
          (v) => v.name === variantName && v.isActive,
        );
        if (variant) {
          if (variant.isSoldOut) {
            throw new AppError(
              400,
              `Variant '${variantName}' of '${menuItem.name}' is sold out`,
            );
          }
          if (
            variant.stockCount !== null &&
            variant.stockCount < item.quantity
          ) {
            throw new AppError(
              400,
              `Insufficient stock for variant '${variantName}': ${variant.stockCount} available, ${item.quantity} requested`,
            );
          }
          price = variant.price;
        }
      }

      orderItemsData.push({
        menuItemId: item.menuItemId,
        itemName: menuItem.name,
        variantName: variantName || undefined,
        priceAtOrder: price,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    const orderNumber = await generateOrderNumber(restaurantId);

    const order = await orderRepository.create({
      restaurantId,
      tableSessionId: dto.sessionId,
      createdByDeviceId: dto.deviceId,
      orderNumber,
      notes: dto.notes,
      lastTriggerEvent: "order_placed",
    });

    if (!order) throw new AppError(500, "Failed to create order");

    const items = await orderRepository.createItems(order.id, orderItemsData);

    // Decrement stock asynchronously — failures are logged but do not block
    // the order response.
    stockAdjustmentService
      .decrementForOrder(dto.items, restaurantId)
      .catch(() => {});

    // Dispatch push notifications + SSE asynchronously
    const table = session.tableId
      ? await tableRepository.findById(session.tableId)
      : null;
    notificationOrchestrator
      .dispatch(
        restaurantId,
        "order_placed",
        {
          type: "order_placed",
          orderId: order.id,
          orderNumber: order.orderNumber,
          restaurantId,
          tableNumber: table?.tableNumber ?? undefined,
        },
        {
          sessionId: dto.sessionId,
          itemCount: items.length,
          tableNumber: table?.tableNumber ?? undefined,
        },
      )
      .catch(() => {});

    return { ...order, items };
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatusUpdate,
    ctx?: AuditContext,
  ) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, "Order not found");

    const currentStatus = order.status || "received";

    // Enforce accept-before-advance (except for cancellation).
    if (status !== "cancelled" && !order.acceptedBy) {
      throw new AppError(
        400,
        "Order must be accepted before updating its status",
      );
    }

    // Validate the transition against the restaurant's configured workflow.
    // No userId is passed — permission enforcement is the middleware's job.
    await workflowService.validateTransition(
      order.restaurantId,
      currentStatus,
      status,
    );

    const triggerEvent =
      status === "cancelled"
        ? "order_cancelled"
        : `status_${currentStatus}_to_${status}`;

    // Persist status + trigger event atomically
    const updated = await orderRepository.updateStatusAndTrigger(
      id,
      status,
      triggerEvent,
    );

    // Fire-and-forget side effects
    orderAuditService.logStatusChange(
      {
        orderId: id,
        restaurantId: order.restaurantId,
        fromStatus: currentStatus,
        toStatus: status,
      },
      ctx,
    );

    // Use the canonical trigger event for both push routing and SSE.
    // order_cancelled is a special case: the SSE event name differs from the
    // status-transition trigger, so we pass triggerEvent as-is and let the
    // orchestrator map it to the right SSE event.
    notificationOrchestrator
      .dispatch(
        order.restaurantId,
        triggerEvent,
        {
          type: "order_status_changed",
          orderId: id,
          orderNumber: order.orderNumber,
          restaurantId: order.restaurantId,
          fromStatus: currentStatus,
          toStatus: status,
        },
      )
      .catch(() => {});

    // Release the waiter's active order slot when delivery is complete
    if (status === "served" && order.claimedBy) {
      availabilityService
        .decrementActiveOrders(order.claimedBy, order.restaurantId)
        .catch(() => {});
    }

    return updated;
  }

  async acceptOrder(orderId: number, userId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, "Order not found");
    if (order.acceptedBy) {
      throw new AppError(400, "Order has already been accepted");
    }

    const updated = await orderRepository.acceptOrder(orderId, userId);
    if (!updated) {
      throw new AppError(400, "Order has already been accepted");
    }

    notificationOrchestrator
      .dispatch(
        order.restaurantId,
        "order_accepted",
        {
          type: "order_status_changed",
          orderId,
          orderNumber: order.orderNumber,
          restaurantId: order.restaurantId,
        },
        { acceptedBy: userId },
      )
      .catch(() => {});

    return updated;
  }

  async getOrdersBySession(sessionId: number) {
    return orderRepository.findBySession(sessionId);
  }

  async getOrdersByRestaurant(restaurantId: number, status?: string) {
    return orderRepository.findByRestaurant(restaurantId, status);
  }

  async getKitchenOrders(restaurantId: number) {
    return orderRepository.getKitchenOrders(restaurantId);
  }

  async getWaiterOrders(restaurantId: number) {
    return orderRepository.getWaiterOrders(restaurantId);
  }

  /** Delivery view: workflow-driven statuses feeding into "served". */
  async getDeliveryOrders(restaurantId: number) {
    return orderRepository.findDeliveryOrders(restaurantId);
  }

  /** Cashier view: active sessions with non-cancelled orders for the bill modal. */
  async getCashierOrders(restaurantId: number) {
    return orderRepository.findCashierOrders(restaurantId);
  }

  /**
   * Overview: minimal order fields (no items array) for manager/owner views.
   * Accepts an optional status filter; excludes terminal states by default.
   */
  async getOrdersOverview(restaurantId: number, status?: string) {
    return orderRepository.findOrdersOverview(restaurantId, status);
  }

  /**
   * Fetch an order with its items, enforcing restaurant ownership to prevent
   * cross-tenant data leaks.
   */
  async getOrderById(id: number, restaurantId: number) {
    const order = await orderRepository.findWithItems(id);
    if (!order) throw new AppError(404, "Order not found");
    if (order.restaurantId !== restaurantId) {
      throw new AppError(403, "Order does not belong to this restaurant");
    }
    return order;
  }

  /**
   * Atomically claim an order for delivery (waiter assignment).
   * Returns 409 if another waiter already claimed it.
   */
  async claimOrder(
    orderId: number,
    userId: string,
    restaurantId: number,
    ctx?: AuditContext,
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, "Order not found");
    if (order.restaurantId !== restaurantId) {
      throw new AppError(403, "Order does not belong to this restaurant");
    }
    if (order.status !== "ready") {
      throw new AppError(400, "Only orders with 'ready' status can be claimed");
    }

    const claimed = await orderRepository.claimOrder(orderId, userId);
    if (!claimed) {
      throw new AppError(409, "Order has already been claimed by another waiter");
    }

    availabilityService
      .incrementActiveOrders(userId, restaurantId)
      .catch(() => {});

    orderAuditService.logClaim(
      { orderId, restaurantId, claimedByUserId: userId },
      ctx,
    );

    notificationOrchestrator
      .dispatch(
        restaurantId,
        "order_claimed",
        {
          type: "order_status_changed",
          orderId,
          orderNumber: order.orderNumber,
          restaurantId,
        },
        { claimedBy: userId },
      )
      .catch(() => {});

    return claimed;
  }

  /**
   * Void an order (only when status is received or preparing).
   * Restores stock and records an audit log entry with the reason.
   */
  async voidOrder(
    orderId: number,
    restaurantId: number,
    reason: string,
    ctx?: AuditContext,
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, "Order not found");
    if (order.restaurantId !== restaurantId) {
      throw new AppError(403, "Order does not belong to this restaurant");
    }

    const currentStatus = order.status || "received";
    if (!["received", "preparing"].includes(currentStatus)) {
      throw new AppError(400, "Only received or preparing orders can be voided");
    }

    const items = await orderRepository.findItemsByOrder(orderId);

    const updated = await orderRepository.updateStatusIfIn(
      orderId,
      "cancelled",
      ["received", "preparing"],
    );
    if (!updated) {
      throw new AppError(400, "Order cannot be voided in its current state");
    }

    await orderRepository.cancelItemsByOrder(orderId);

    // Restore stock — delegated entirely to StockAdjustmentService
    await stockAdjustmentService.restoreForItems(
      items.map((i) => ({
        menuItemId: i.menuItemId,
        variantName: i.variantName,
        quantity: i.quantity ?? 1,
      })),
      restaurantId,
    );

    orderAuditService.logVoid(
      { orderId, restaurantId, fromStatus: currentStatus, reason },
      ctx,
    );

    // Always emit SSE; only dispatch push when the order was being prepared
    // (kitchen needs to know it was voided mid-cook).
    const voidTrigger =
      currentStatus === "preparing" ? "order_cancelled" : "order_status_changed";
    notificationOrchestrator
      .dispatch(
        restaurantId,
        voidTrigger,
        {
          type: "order_status_changed",
          orderId,
          orderNumber: order.orderNumber,
          restaurantId,
          fromStatus: currentStatus,
          toStatus: "cancelled",
        },
      )
      .catch(() => {});

    return updated;
  }

  /**
   * Update or remove an order item before the order reaches ready status.
   */
  async updateOrderItem(
    orderId: number,
    orderItemId: number,
    restaurantId: number,
    input: { quantity?: number; remove?: boolean },
    ctx?: AuditContext,
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, "Order not found");
    if (order.restaurantId !== restaurantId) {
      throw new AppError(403, "Order does not belong to this restaurant");
    }

    const currentStatus = order.status || "received";
    if (!["received", "preparing"].includes(currentStatus)) {
      throw new AppError(400, "Order items can only be modified before ready");
    }

    const orderItem = await orderRepository.findItemById(orderItemId);
    if (!orderItem || orderItem.orderId !== orderId) {
      throw new AppError(404, "Order item not found");
    }

    const originalQty = orderItem.quantity ?? 1;

    if (input.remove || (input.quantity !== undefined && input.quantity <= 0)) {
      await orderRepository.deleteOrderItem(orderItemId);

      await stockAdjustmentService.restoreForItems(
        [
          {
            menuItemId: orderItem.menuItemId,
            variantName: orderItem.variantName,
            quantity: originalQty,
          },
        ],
        restaurantId,
      );

      orderAuditService.logItemEdit(
        {
          orderId,
          restaurantId,
          orderItemId,
          oldQuantity: originalQty,
          newQuantity: null,
        },
        ctx,
      );

      return { removed: true };
    }

    if (input.quantity === undefined) {
      throw new AppError(400, "Quantity is required unless removing item");
    }

    const newQty = input.quantity;
    if (newQty < 1) throw new AppError(400, "Quantity must be at least 1");

    if (newQty !== originalQty) {
      // Throws AppError if insufficient stock for an increase
      await stockAdjustmentService.adjustForQuantityChange(
        {
          menuItemId: orderItem.menuItemId,
          variantName: orderItem.variantName,
          quantity: originalQty, // kept for interface compat
          oldQuantity: originalQty,
          newQuantity: newQty,
        },
        restaurantId,
      );
    }

    const updatedItem = await orderRepository.updateItemQuantity(
      orderItemId,
      newQty,
    );

    orderAuditService.logItemEdit(
      {
        orderId,
        restaurantId,
        orderItemId,
        oldQuantity: originalQty,
        newQuantity: newQty,
      },
      ctx,
    );

    return updatedItem;
  }

  /**
   * Re-send the push notification for an order based on its stored trigger event.
   *
   * Reads `lastTriggerEvent` directly from the order row — no workflow
   * reverse-lookup required.  Falls back to status-derived events for
   * existing orders that pre-date the column.
   */
  async resendNotification(
    orderId: number,
    restaurantId: number,
    ctx?: AuditContext,
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, "Order not found");
    if (order.restaurantId !== restaurantId) {
      throw new AppError(403, "Order does not belong to this restaurant");
    }

    const currentStatus = order.status || "received";

    // Prefer the stored trigger event (set by createOrder / updateOrderStatus).
    // Fall back to a deterministic derivation for legacy rows.
    const triggerEvent =
      order.lastTriggerEvent ??
      (currentStatus === "received"
        ? "order_placed"
        : currentStatus === "cancelled"
          ? "order_cancelled"
          : `status_received_to_${currentStatus}`);

    await notificationOrchestrator.dispatch(restaurantId, triggerEvent, {
      type:
        currentStatus === "received" ? "order_placed" : "order_status_changed",
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantId,
    });

    orderAuditService.logResend(
      { orderId, restaurantId, triggerEvent, status: currentStatus },
      ctx,
    );
  }
}

export const orderService = new OrderService();
