import type { Request, Response, NextFunction } from "express";
import { db } from "@menugo/data";
import { restaurants, restaurantTables } from "@menugo/data/schemas";
import { eq, and } from "drizzle-orm";
import { menuService } from "../services/menu.service";
import { sessionService } from "../services/session.service";
import { orderService } from "../services/order.service";
import { AppError } from "../types";

// ── Shared helpers to avoid duplicated slug → restaurant → table lookup ──

async function resolveRestaurant(slug: string) {
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, slug));
  if (!restaurant) throw new AppError(404, "Restaurant not found");
  return restaurant;
}

async function resolveTable(slug: string, tableNumber: number) {
  const restaurant = await resolveRestaurant(slug);
  const [table] = await db
    .select()
    .from(restaurantTables)
    .where(
      and(
        eq(restaurantTables.restaurantId, restaurant.id),
        eq(restaurantTables.tableNumber, tableNumber),
      ),
    );
  if (!table) throw new AppError(404, "Table not found");
  return { restaurant, table };
}

function restaurantDTO(r: {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  currency: string | null;
}) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    logo: r.logo,
    currency: r.currency,
  };
}

class PublicController {
  async getTableInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurant, table } = await resolveTable(
        req.params.slug as string,
        Number(req.params.tableNumber),
      );

      const deviceId = req.query.deviceId as string | undefined;
      const tableInfo = await sessionService.getTableInfo(table, deviceId);

      return res.json({
        success: true,
        data: { restaurant: restaurantDTO(restaurant), table: tableInfo },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurant = await resolveRestaurant(req.params.slug as string);
      const menu = await menuService.getFullMenu(restaurant.id);

      return res.json({
        success: true,
        data: { restaurant: restaurantDTO(restaurant), menu },
      });
    } catch (error) {
      next(error);
    }
  }

  async createOrGetSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId, personsCount, customerName } = req.body;
      if (!deviceId) {
        return res
          .status(400)
          .json({ success: false, message: "deviceId required" });
      }

      const { restaurant, table } = await resolveTable(
        req.params.slug as string,
        Number(req.params.tableNumber),
      );

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
        return res
          .status(400)
          .json({ success: false, message: "Invalid session ID" });
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
        return res
          .status(400)
          .json({ success: false, message: "Invalid session ID" });
      }

      const { deviceId, items, notes } = req.body;

      if (!deviceId) {
        return res
          .status(400)
          .json({ success: false, message: "deviceId required" });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Items required" });
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
        return res
          .status(400)
          .json({ success: false, message: "Invalid session ID" });
      }

      const orders = await orderService.getOrdersBySession(sessionId);
      return res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }
}

export const publicController = new PublicController();
