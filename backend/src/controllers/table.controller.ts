import type { Request, Response, NextFunction } from "express";
import { tableService } from "../services/table.service";

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
}

export const tableController = new TableController();
