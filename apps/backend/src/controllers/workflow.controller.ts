import type { Request, Response, NextFunction } from "express";
import { workflowService } from "../services/workflow.service";

/** Extract audit context from Express request. */
function auditCtx(req: Request) {
  return {
    actorUserId: req.user!.id,
    ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null,
  };
}

class WorkflowController {
  async getWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const workflows = await workflowService.getWorkflows(restaurantId);
      return res.json({ success: true, data: workflows });
    } catch (error) {
      next(error);
    }
  }

  async updateWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { transitions } = req.body;
      const result = await workflowService.updateWorkflows(
        restaurantId,
        transitions,
        auditCtx(req),
      );
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const workflowController = new WorkflowController();
