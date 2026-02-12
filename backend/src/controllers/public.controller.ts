import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { restaurants } from "../db/schemas/restaurant.schema";
import { restaurantTables } from "../db/schemas/table.schema";
import { eq, and } from "drizzle-orm";
import { menuService } from "../services/menu.service";
import { sessionService } from "../services/session.service";
import { orderService } from "../services/order.service";

class PublicController {
  async getTableInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const tableNumber = req.params.tableNumber as string;

      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.slug, slug));

      if (!restaurant) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      const [table] = await db
        .select()
        .from(restaurantTables)
        .where(
          and(
            eq(restaurantTables.restaurantId, restaurant.id),
            eq(restaurantTables.tableNumber, Number(tableNumber))
          )
        );

      if (!table) {
        return res.status(404).json({ success: false, message: "Table not found" });
      }

      const deviceId = req.query.deviceId as string | undefined;
      const tableInfo = await sessionService.getTableInfo(table.id, table, deviceId);

      return res.json({
        success: true,
        data: {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            description: restaurant.description,
            logo: restaurant.logo,
            currency: restaurant.currency,
          },
          table: tableInfo,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.slug, slug));

      if (!restaurant) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      const menu = await menuService.getFullMenu(restaurant.id);
      return res.json({
        success: true,
        data: {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            description: restaurant.description,
            logo: restaurant.logo,
            currency: restaurant.currency,
          },
          menu,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createOrGetSession(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string;
      const tableNumber = req.params.tableNumber as string;
      const { deviceId, personsCount, customerName } = req.body;

      if (!deviceId) {
        return res.status(400).json({ success: false, message: "deviceId required" });
      }

      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.slug, slug));

      if (!restaurant) {
        return res.status(404).json({ success: false, message: "Restaurant not found" });
      }

      const [table] = await db
        .select()
        .from(restaurantTables)
        .where(
          and(
            eq(restaurantTables.restaurantId, restaurant.id),
            eq(restaurantTables.tableNumber, Number(tableNumber))
          )
        );

      if (!table) {
        return res.status(404).json({ success: false, message: "Table not found" });
      }

      const session = await sessionService.createSession(restaurant.id, {
        tableId: table.id,
        hostDeviceId: deviceId,
        personsCount,
        customerName,
      });

      return res.status(session.existed ? 200 : 201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async joinSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { joinCode, deviceId, participantName } = req.body;

      if (!joinCode || !deviceId) {
        return res
          .status(400)
          .json({ success: false, message: "joinCode and deviceId required" });
      }

      const result = await sessionService.joinSession({
        joinCode,
        deviceId,
        participantName,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getSessionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.sessionId);
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid session ID" });
      }
      const session = await sessionService.getSessionById(id);
      return res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  async placeOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = Number(req.params.sessionId);
      if (!sessionId || isNaN(sessionId)) {
        return res.status(400).json({ success: false, message: "Invalid session ID" });
      }

      const { deviceId, items, notes } = req.body;

      if (!deviceId) {
        return res.status(400).json({ success: false, message: "deviceId required" });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Items required" });
      }

      // Get the session to find restaurantId
      const session = await sessionService.getSessionById(sessionId);

      const order = await orderService.createOrder(session.restaurantId, {
        sessionId,
        deviceId,
        items,
        notes,
      });

      return res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  async getSessionOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = Number(req.params.sessionId);
      if (!sessionId || isNaN(sessionId)) {
        return res.status(400).json({ success: false, message: "Invalid session ID" });
      }

      const orders = await orderService.getOrdersBySession(sessionId);
      return res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }
}

export const publicController = new PublicController();
