import { orderRepository } from "../repositories/order.repository";
import { sessionRepository } from "../repositories/session.repository";
import { participantRepository } from "../repositories/participant.repository";
import { menuRepository } from "../repositories/menu.repository";
import { notificationService } from "./notification.service";
import { AppError } from "../types";
import type {
  CreateOrderDTO,
  CreateStaffOrderDTO,
  OrderStatusUpdate,
  ItemStatusUpdate,
  StaffAcceptRole,
} from "@menugo/dto";
import { generateOrderNumber } from "../utils/order-number";
import { logger } from "../utils/logger";

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["paid"],
  paid: [],
  cancelled: [],
};

const VALID_ITEM_TRANSITIONS: Record<string, string[]> = {
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: [],
  cancelled: [],
};

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

      let price = menuItem.price;
      const variantName = item.variantName;

      if (variantName) {
        const variants = await menuRepository.findVariantsByItem(item.menuItemId);
        const variant = variants.find((v) => v.name === variantName && v.isActive);
        if (variant) price = variant.price;
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

    // Notify all enabled kitchen + waiter staff
    notificationService
      .sendOrderNotificationToKitchensByItems(restaurantId, "order_placed", {
        type: "order_placed",
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId,
      }, order.id)
      .catch((err) => logger.error("Failed to send order placed notification", err));

    return { ...order, items };
  }

  async createStaffOrder(restaurantId: number, staffUserId: string, dto: CreateStaffOrderDTO) {
    // Validate session
    const session = await sessionRepository.findById(dto.sessionId);
    if (!session) throw new AppError(404, "Session not found");
    if (session.status !== "active") {
      throw new AppError(400, "Session is not active");
    }
    if (session.restaurantId !== restaurantId) {
      throw new AppError(400, "Session does not belong to this restaurant");
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

      let price = menuItem.price;
      const variantName = item.variantName;

      if (variantName) {
        const variants = await menuRepository.findVariantsByItem(item.menuItemId);
        const variant = variants.find((v) => v.name === variantName && v.isActive);
        if (variant) price = variant.price;
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
      createdBy: staffUserId,
      orderNumber,
      notes: dto.notes,
    });

    if (!order) throw new AppError(500, "Failed to create order");

    const items = await orderRepository.createItems(order.id, orderItemsData);

    // Notify all enabled kitchen + waiter staff
    notificationService
      .sendOrderNotificationToKitchensByItems(restaurantId, "order_placed", {
        type: "order_placed",
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantId,
      }, order.id)
      .catch((err) => logger.error("Failed to send order placed notification", err));

    return { ...order, items };
  }

  async updateOrderStatus(id: number, status: OrderStatusUpdate) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, "Order not found");

    const currentStatus = order.status || "received";
    const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(status)) {
      throw new AppError(400, `Cannot transition from '${currentStatus}' to '${status}'`);
    }

    const updated = await orderRepository.updateStatus(id, status);

    const triggerEvent =
      status === "cancelled"
        ? "order_cancelled"
        : (`status_${currentStatus}_to_${status}` as any);

    notificationService
      .sendOrderNotification(order.restaurantId, triggerEvent, {
        type: "order_status_changed",
        orderId: id,
        orderNumber: order.orderNumber,
        restaurantId: order.restaurantId,
        fromStatus: currentStatus,
        toStatus: status,
      })
      .catch((err) => logger.error("Failed to send status change notification", err));

    return updated;
  }

  /**
   * Update a single order item's status.
   * Only the staff who accepted the item (kitchen or waiter) should call this.
   * Auto-recomputes and persists the parent order's aggregate status.
   */
  async updateItemStatus(
    orderId: number,
    itemId: number,
    status: ItemStatusUpdate,
    userId: string,
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, "Order not found");

    const item = await orderRepository.findItemById(itemId);
    if (!item || item.orderId !== orderId) throw new AppError(404, "Item not found");

    const currentStatus = item.status || "received";
    const allowed = VALID_ITEM_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(status)) {
      throw new AppError(400, `Cannot transition item from '${currentStatus}' to '${status}'`);
    }

    const updatedItem = await orderRepository.updateItemStatus(itemId, status);

    // Auto-compute and sync the parent order's status
    const newOrderStatus = await orderRepository.computeOrderStatusFromItems(orderId);
    await orderRepository.updateStatus(orderId, newOrderStatus);

    // Determine who to notify:
    // - Customers always get notified
    // - For inter-staff notifications (waiter needs to know when item is ready),
    //   only notify the waiter who claimed the item (if claimed), otherwise all waiters
    const itemEventMap: Record<string, any> = {
      preparing: "item_status_preparing",
      ready: "item_status_ready",
      served: "item_status_served",
    };
    const triggerEvent = status === "cancelled" ? "order_cancelled" : itemEventMap[status];

    if (triggerEvent) {
      // Notify the assigned waiter (if item is ready) or staff
      notificationService
        .sendItemNotification(order.restaurantId, triggerEvent, {
          type: "item_status_changed",
          orderId,
          orderNumber: order.orderNumber,
          restaurantId: order.restaurantId,
          itemId,
          itemName: item.itemName,
          itemStatus: status,
        }, item.acceptedByKitchen || null, item.acceptedByWaiter || null)
        .catch((err) => logger.error("Failed to send item status notification", err));
    }

    // Notify customer
    notificationService
      .sendCustomerNotification(order.tableSessionId, {
        type: "item_status_changed",
        orderId,
        orderNumber: order.orderNumber,
        itemId,
        itemName: item.itemName,
        itemStatus: status,
        message: `Your ${item.itemName} is now ${status}`,
      })
      .catch((err) => logger.error("Failed to send customer notification", err));

    return { ...updatedItem, orderStatus: newOrderStatus };
  }

  /**
   * Accept a specific order item (kitchen or waiter).
   * Kitchen accepts item to prepare; waiter accepts item to deliver.
   */
  async acceptOrderItem(
    orderId: number,
    itemId: number,
    userId: string,
    role: StaffAcceptRole,
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError(404, "Order not found");

    const item = await orderRepository.findItemById(itemId);
    if (!item || item.orderId !== orderId) throw new AppError(404, "Item not found");

    // Check if already accepted by this role
    const alreadyAccepted = role === "kitchen" ? item.acceptedByKitchen : item.acceptedByWaiter;
    if (alreadyAccepted) {
      throw new AppError(400, `Item has already been accepted by ${role}`);
    }

    const updated = await orderRepository.acceptOrderItem(itemId, userId, role);
    if (!updated) {
      throw new AppError(400, "Item has already been accepted (race condition)");
    }

    // Notify the accepting staff's colleagues and customer
    if (role === "kitchen") {
      notificationService
        .sendOrderNotification(order.restaurantId, "item_accepted_kitchen", {
          type: "item_accepted",
          orderId,
          orderNumber: order.orderNumber,
          restaurantId: order.restaurantId,
          itemId,
          itemName: item.itemName,
          acceptedByRole: "kitchen",
        })
        .catch((err) => logger.error("Failed to send item accept notification", err));
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
}

export const orderService = new OrderService();
