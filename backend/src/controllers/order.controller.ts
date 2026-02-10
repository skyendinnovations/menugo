import type { Request, Response, NextFunction } from "express";
import { orderService } from "../services/order.service";

class OrderController {
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { status } = req.query;
      const orders = await orderService.getOrdersByRestaurant(
        restaurantId,
        status as string | undefined
      );
      return res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.orderId);
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid order ID" });
      }
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
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid order ID" });
      }
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: "Status required" });
      }
      const order = await orderService.updateOrderStatus(id, status);
      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
