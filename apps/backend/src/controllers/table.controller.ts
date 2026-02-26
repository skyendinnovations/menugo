import type { Request, Response, NextFunction } from "express";
import { tableService } from "../services/table.service";

/** Extract audit context from Express request. */
function auditCtx(req: Request) {
  return {
    actorUserId: req.user!.id,
    ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null,
  };
}

class TableController {
  async getTables(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const tables = await tableService.getTables(restaurantId);
      return res.json({ success: true, data: tables });
    } catch (error) {
      next(error);
    }
  }

  async createTable(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { tableNumber, capacity } = req.body;

      if (!tableNumber || typeof tableNumber !== "number") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid tableNumber" });
      }

      const table = await tableService.createTable(restaurantId, {
        tableNumber,
        capacity,
      });
      return res.status(201).json({ success: true, data: table });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateTables(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { from, to, capacity } = req.body;

      if (typeof from !== "number" || typeof to !== "number") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid 'from' or 'to'" });
      }

      const tables = await tableService.bulkCreateTables(restaurantId, {
        from,
        to,
        capacity,
      });
      return res.status(201).json({ success: true, data: tables });
    } catch (error) {
      next(error);
    }
  }

  async updateTable(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.tableId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid table ID" });
      }

      const table = await tableService.updateTable(id, req.body);
      return res.json({ success: true, data: table });
    } catch (error) {
      next(error);
    }
  }

  async deleteTable(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.tableId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid table ID" });
      }

      await tableService.deleteTable(id);
      return res.json({ success: true, message: "Table deleted" });
    } catch (error) {
      next(error);
    }
  }

  async getTableQR(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.tableId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid table ID" });
      }

      const qr = await tableService.getTableQR(id);
      return res.json({ success: true, data: qr });
    } catch (error) {
      next(error);
    }
  }

  async blockTable(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const tableId = Number(req.params.tableId);
      if (!tableId || isNaN(tableId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid table ID" });
      }

      const userId = req.user!.id;
      const table = await tableService.blockTable(
        tableId,
        restaurantId,
        userId,
        auditCtx(req),
      );
      return res.json({ success: true, data: table, message: "Table blocked" });
    } catch (error) {
      next(error);
    }
  }

  async unblockTable(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const tableId = Number(req.params.tableId);
      if (!tableId || isNaN(tableId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid table ID" });
      }

      const userId = req.user!.id;
      const table = await tableService.unblockTable(
        tableId,
        restaurantId,
        userId,
        auditCtx(req),
      );
      return res.json({
        success: true,
        data: table,
        message: "Table unblocked",
      });
    } catch (error) {
      next(error);
    }
  }

  async forceReleaseTable(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const tableId = Number(req.params.tableId);
      if (!tableId || isNaN(tableId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid table ID" });
      }

      const { reason } = req.body;
      const userId = req.user!.id;

      const result = await tableService.forceReleaseTable(
        tableId,
        restaurantId,
        userId,
        reason,
        auditCtx(req),
      );
      return res.json({
        success: true,
        data: result,
        message: "Table force-released",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const tableController = new TableController();
