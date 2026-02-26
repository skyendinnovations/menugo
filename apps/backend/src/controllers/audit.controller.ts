import type { Request, Response, NextFunction } from "express";
import { auditService } from "../services/audit.service";
import type { AuditLogFilters } from "@menugo/dto";

class AuditController {
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);

      const filters: AuditLogFilters = {
        action: req.query.action as AuditLogFilters["action"],
        entityType: req.query.entityType as AuditLogFilters["entityType"],
        entityId: req.query.entityId as string | undefined,
        actorUserId: req.query.actorUserId as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await auditService.getLogs(restaurantId, filters);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
