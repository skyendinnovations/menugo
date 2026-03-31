import type { Request, Response, NextFunction } from "express";
import { orderService } from "../services/order.service";

class OrderController {
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { status } = req.query;
      const orders = await orderService.getOrdersByRestaurant(restaurantId, status as string | undefined);
      return res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.orderId);
      if (!id || isNaN(id)) return res.status(400).json({ success: false, message: "Invalid order ID" });
      const order = await orderService.getOrderById(id);
      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  async getKitchenOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const orders = await orderService.getKitchenOrders(restaurantId);
      return res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  async getWaiterOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const orders = await orderService.getWaiterOrders(restaurantId);
      return res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.orderId);
      if (!id || isNaN(id)) return res.status(400).json({ success: false, message: "Invalid order ID" });
      const { status } = req.body;
      if (!status) return res.status(400).json({ success: false, message: "Status required" });
      const order = await orderService.updateOrderStatus(id, status);
      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  async acceptOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.params.orderId);
      if (!orderId || isNaN(orderId)) return res.status(400).json({ success: false, message: "Invalid order ID" });
      const userId = req.user!.id;
      const order = await orderService.acceptOrder(orderId, userId);
      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /orders/:orderId/items/:itemId/status */
  async updateItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.params.orderId);
      const itemId = Number(req.params.itemId);
      if (!orderId || isNaN(orderId)) return res.status(400).json({ success: false, message: "Invalid order ID" });
      if (!itemId || isNaN(itemId)) return res.status(400).json({ success: false, message: "Invalid item ID" });

      const { status } = req.body;
      if (!status) return res.status(400).json({ success: false, message: "Status required" });

      const userId = req.user!.id;
      const result = await orderService.updateItemStatus(orderId, itemId, status, userId);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /** POST /orders/:orderId/items/:itemId/accept */
  async acceptOrderItem(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.params.orderId);
      const itemId = Number(req.params.itemId);
      if (!orderId || isNaN(orderId)) return res.status(400).json({ success: false, message: "Invalid order ID" });
      if (!itemId || isNaN(itemId)) return res.status(400).json({ success: false, message: "Invalid item ID" });

      const { role } = req.body;
      if (!role || !["kitchen", "waiter"].includes(role)) {
        return res.status(400).json({ success: false, message: "role must be 'kitchen' or 'waiter'" });
      }

      const userId = req.user!.id;
      const result = await orderService.acceptOrderItem(orderId, itemId, userId, role);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
