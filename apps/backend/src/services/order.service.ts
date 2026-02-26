import { orderRepository } from "../repositories/order.repository";
import { sessionRepository } from "../repositories/session.repository";
import { participantRepository } from "../repositories/participant.repository";
import { menuRepository } from "../repositories/menu.repository";
import { tableRepository } from "../repositories/table.repository";
import { workflowNotificationService } from "./workflow-notification.service";
import { workflowService } from "./workflow.service";
import { stockService } from "./stock.service";
import { availabilityService } from "./availability.service";
import { auditService } from "./audit.service";
import { eventBus } from "./event-bus.service";
import { AppError } from "../types";
import type {
  CreateOrderDTO,
  OrderStatusUpdate,
  NotificationTriggerEvent,
} from "@menugo/dto";
import { generateOrderNumber } from "../utils/order-number";
import { logger } from "../utils/logger";

/** Contextual info passed from the controller for audit logging. */
interface AuditContext {
  actorUserId: string;
  ipAddress?: string;
}

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
      if (menuItem.stockCount !== null) {
        if (menuItem.stockCount < item.quantity) {
          throw new AppError(
            400,
            `Insufficient stock for '${menuItem.name}': ${menuItem.stockCount} available, ${item.quantity} requested`,
          );
        }
      }

      let price = menuItem.price;
      const variantName = item.variantName;

      // If variant is specified, use variant price
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
    });

    if (!order) throw new AppError(500, "Failed to create order");

    const items = await orderRepository.createItems(order.id, orderItemsData);

    // Decrement stock for all items with tracked inventory
    for (const item of dto.items) {
      const menuItem = await menuRepository.findItemById(item.menuItemId);
      if (menuItem && menuItem.stockCount !== null) {
        stockService
          .decrementItemStock(item.menuItemId, restaurantId, item.quantity)
          .catch((err) =>
            logger.error("Failed to decrement item stock", err),
          );
      }

      // Decrement variant stock if applicable
      if (item.variantName) {
        const variants = await menuRepository.findVariantsByItem(
          item.menuItemId,
        );
        const variant = variants.find(
          (v) => v.name === item.variantName && v.isActive,
        );
        if (variant && variant.stockCount !== null) {
          stockService
            .decrementVariantStock(
              variant.id,
              restaurantId,
              item.quantity,
              menuItem?.name ?? "",
            )
            .catch((err) =>
              logger.error("Failed to decrement variant stock", err),
            );
        }
      }
    }

    // Send notification asynchronously (workflow-aware routing)
    workflowNotificationService
      .dispatch(restaurantId, "order_placed", {
        type: "order_placed",
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId,
      })
      .catch((err) =>
        logger.error("Failed to send order placed notification", err)
      );

    // Emit real-time event for SSE / polling clients
    const table = session.tableId
      ? await tableRepository.findById(session.tableId)
      : null;
    eventBus.emit(restaurantId, "order_placed", {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: table?.tableNumber,
      sessionId: dto.sessionId,
      itemCount: items.length,
    });

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

    // Dynamic workflow validation (replaces hardcoded transition map)
    await workflowService.validateTransition(
      order.restaurantId,
      currentStatus,
      status,
      ctx?.actorUserId,
    );

    const updated = await orderRepository.updateStatus(id, status);

    // Audit log the status transition
    if (ctx) {
      auditService
        .log({
          restaurantId: order.restaurantId,
          actorUserId: ctx.actorUserId,
          action: "order_status_changed",
          entityType: "order",
          entityId: id,
          oldValue: { status: currentStatus },
          newValue: { status },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Send notification asynchronously
    const triggerEvent =
      status === "cancelled"
        ? "order_cancelled"
        : (`status_${currentStatus}_to_${status}` as NotificationTriggerEvent);

    // Send notification asynchronously (workflow-aware routing)
    workflowNotificationService
      .dispatch(order.restaurantId, triggerEvent, {
        type: "order_status_changed",
        orderId: id,
        orderNumber: order.orderNumber,
        restaurantId: order.restaurantId,
        fromStatus: currentStatus,
        toStatus: status,
      })
      .catch((err) =>
        logger.error("Failed to send status change notification", err)
      );

    // Emit real-time event for SSE / polling clients
    if (status === "cancelled") {
      eventBus.emit(order.restaurantId, "order_cancelled", {
        orderId: id,
        orderNumber: order.orderNumber,
      });
    } else {
      eventBus.emit(order.restaurantId, "order_status_changed", {
        orderId: id,
        orderNumber: order.orderNumber,
        fromStatus: currentStatus,
        toStatus: status,
      });
    }

    // Decrement active order count when a claimed order is served
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

    // Emit real-time event for SSE / polling clients
    eventBus.emit(order.restaurantId, "order_accepted", {
      orderId,
      orderNumber: order.orderNumber,
      acceptedBy: userId,
    });

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

  async getOrderById(id: number) {
    const order = await orderRepository.findWithItems(id);
    if (!order) throw new AppError(404, "Order not found");
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
      throw new AppError(
        400,
        "Only orders with 'ready' status can be claimed",
      );
    }

    const claimed = await orderRepository.claimOrder(orderId, userId);
    if (!claimed) {
      throw new AppError(
        409,
        "Order has already been claimed by another waiter",
      );
    }

    // Increment waiter's active order count
    availabilityService
      .incrementActiveOrders(userId, restaurantId)
      .catch(() => {});

    // Audit log
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "order_claimed",
          entityType: "order",
          entityId: orderId,
          newValue: { claimedBy: userId },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit real-time event
    eventBus.emit(restaurantId, "order_claimed", {
      orderId,
      orderNumber: order.orderNumber,
      claimedBy: userId,
    });

    return claimed;
  }

  /**
   * Void an order (only when status is received or preparing).
   * Restores stock and records audit log with reason.
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

    // Restore stock for each item
    for (const item of items) {
      const menuItem = await menuRepository.findItemById(item.menuItemId);
      if (!menuItem) continue;

      if (item.variantName) {
        const variants = await menuRepository.findVariantsByItem(item.menuItemId);
        const variant = variants.find((v) => v.name === item.variantName);
        if (variant && variant.stockCount !== null) {
          await stockService.incrementVariantStock(
            variant.id,
            restaurantId,
            item.quantity ?? 1,
            menuItem.name,
            variant.name,
          );
          continue;
        }
      }

      if (menuItem.stockCount !== null) {
        await stockService.incrementItemStock(
          menuItem.id,
          restaurantId,
          item.quantity ?? 1,
          menuItem.name,
        );
      }
    }

    // Audit log the void
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "order_voided",
          entityType: "order",
          entityId: orderId,
          oldValue: { status: currentStatus },
          newValue: { status: "cancelled" },
          reason,
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit real-time event
    eventBus.emit(restaurantId, "order_status_changed", {
      orderId,
      orderNumber: order.orderNumber,
      fromStatus: currentStatus,
      toStatus: "cancelled",
    });

    // Notify kitchen if order was preparing
    if (currentStatus === "preparing") {
      workflowNotificationService
        .dispatch(restaurantId, "order_cancelled", {
          type: "order_status_changed",
          orderId,
          orderNumber: order.orderNumber,
          restaurantId,
          fromStatus: currentStatus,
          toStatus: "cancelled",
        })
        .catch((err) =>
          logger.error("Failed to send order void notification", err),
        );
    }

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

    const menuItem = await menuRepository.findItemById(orderItem.menuItemId);
    if (!menuItem) throw new AppError(404, "Menu item not found");

    const originalQty = orderItem.quantity ?? 1;

    if (input.remove || (input.quantity !== undefined && input.quantity <= 0)) {
      await orderRepository.deleteOrderItem(orderItemId);

      // Restore stock for removed quantity
      if (orderItem.variantName) {
        const variants = await menuRepository.findVariantsByItem(orderItem.menuItemId);
        const variant = variants.find((v) => v.name === orderItem.variantName);
        if (variant && variant.stockCount !== null) {
          await stockService.incrementVariantStock(
            variant.id,
            restaurantId,
            originalQty,
            menuItem.name,
            variant.name,
          );
        }
      } else if (menuItem.stockCount !== null) {
        await stockService.incrementItemStock(
          menuItem.id,
          restaurantId,
          originalQty,
          menuItem.name,
        );
      }

      if (ctx) {
        auditService
          .log({
            restaurantId,
            actorUserId: ctx.actorUserId,
            action: "override",
            entityType: "order",
            entityId: orderId,
            oldValue: { itemId: orderItemId, quantity: originalQty },
            newValue: { itemId: orderItemId, removed: true },
            ipAddress: ctx.ipAddress,
          })
          .catch(() => {});
      }

      return { removed: true };
    }

    if (input.quantity === undefined) {
      throw new AppError(400, "Quantity is required unless removing item");
    }

    const newQty = input.quantity;
    if (newQty < 1) {
      throw new AppError(400, "Quantity must be at least 1");
    }

    const diff = newQty - originalQty;
    if (diff === 0) {
      return orderItem;
    }

    // Handle stock adjustments based on quantity change
    if (diff > 0) {
      if (orderItem.variantName) {
        const variants = await menuRepository.findVariantsByItem(orderItem.menuItemId);
        const variant = variants.find((v) => v.name === orderItem.variantName);
        if (variant && variant.stockCount !== null) {
          if (variant.stockCount < diff) {
            throw new AppError(
              400,
              `Insufficient stock for variant '${variant.name}': ${variant.stockCount} available, ${diff} requested`,
            );
          }
          await stockService.decrementVariantStock(
            variant.id,
            restaurantId,
            diff,
            menuItem.name,
          );
        }
      } else if (menuItem.stockCount !== null) {
        if (menuItem.stockCount < diff) {
          throw new AppError(
            400,
            `Insufficient stock for '${menuItem.name}': ${menuItem.stockCount} available, ${diff} requested`,
          );
        }
        await stockService.decrementItemStock(menuItem.id, restaurantId, diff);
      }
    } else if (diff < 0) {
      const restoreQty = Math.abs(diff);
      if (orderItem.variantName) {
        const variants = await menuRepository.findVariantsByItem(orderItem.menuItemId);
        const variant = variants.find((v) => v.name === orderItem.variantName);
        if (variant && variant.stockCount !== null) {
          await stockService.incrementVariantStock(
            variant.id,
            restaurantId,
            restoreQty,
            menuItem.name,
            variant.name,
          );
        }
      } else if (menuItem.stockCount !== null) {
        await stockService.incrementItemStock(
          menuItem.id,
          restaurantId,
          restoreQty,
          menuItem.name,
        );
      }
    }

    const updatedItem = await orderRepository.updateItemQuantity(
      orderItemId,
      newQty,
    );

    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "override",
          entityType: "order",
          entityId: orderId,
          oldValue: { itemId: orderItemId, quantity: originalQty },
          newValue: { itemId: orderItemId, quantity: newQty },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    return updatedItem;
  }

  /**
   * Re-send the notification for an order based on its current status.
   * Guarded by the `resend_notification` permission.
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

    const STATUS_TO_TRIGGER: Record<string, NotificationTriggerEvent> = {
      received: "order_placed",
      preparing: "status_received_to_preparing",
      ready: "status_preparing_to_ready",
      served: "status_ready_to_served",
      paid: "status_served_to_paid",
      cancelled: "order_cancelled",
    };

    const currentStatus = order.status || "received";
    const triggerEvent = STATUS_TO_TRIGGER[currentStatus];
    if (!triggerEvent) {
      throw new AppError(
        400,
        "Cannot resend notification for this order status",
      );
    }

    await workflowNotificationService.dispatch(restaurantId, triggerEvent, {
      type:
        currentStatus === "received" ? "order_placed" : "order_status_changed",
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantId,
    });

    // Audit log the resend
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "notification_resent",
          entityType: "order",
          entityId: orderId,
          newValue: { triggerEvent, status: currentStatus },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }
  }
}

export const orderService = new OrderService();
