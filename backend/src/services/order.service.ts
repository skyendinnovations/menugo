import { orderRepository } from "../repositories/order.repository";
import { sessionRepository } from "../repositories/session.repository";
import { participantRepository } from "../repositories/participant.repository";
import { menuRepository } from "../repositories/menu.repository";
import { AppError } from "../types";
import type {
  CreateOrderDTO,
  OrderStatusUpdate,
} from "../types/order.types";
import { generateOrderNumber } from "../utils/order-number";

const VALID_TRANSITIONS: Record<string, string[]> = {
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["paid"],
  paid: [],
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
      dto.sessionId
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
      let variantName = item.variantName;

      // If variant is specified, use variant price
      if (variantName) {
        const variants = await menuRepository.findVariantsByItem(
          item.menuItemId
        );
        const variant = variants.find(
          (v) => v.name === variantName && v.isActive
        );
        if (variant) {
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

    return { ...order, items };
  }

  async updateOrderStatus(id: number, status: OrderStatusUpdate) {
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, "Order not found");

    if (!order) throw new AppError(404, "Order not found");
    const currentStatus = order.status || "received";
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(status)) {
      throw new AppError(
        400,
        `Cannot transition from '${currentStatus}' to '${status}'`
      );
    }

    return orderRepository.updateStatus(id, status);
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
