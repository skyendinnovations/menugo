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

  async getOrderFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const flow = await workflowService.getOrderFlow(restaurantId);
      return res.json({ success: true, data: flow });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mobile-facing endpoint: returns the same `{ statuses, transitions }` shape
   * as `getOrderFlow` but is guarded by `requireMembership` rather than a
   * specific permission, so any authenticated staff member can fetch it.
   *
   * Used by the `useWorkflow` hook (Part 5).
   */
  async getFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const flow = await workflowService.getOrderFlow(restaurantId);
      return res.json({ success: true, data: flow });
    } catch (error) {
      next(error);
    }
  }

  async getFlowConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const config = await workflowService.getFlowConfig(restaurantId);
      return res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  async saveFlowConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { steps } = req.body;
      const config = await workflowService.saveFlowConfig(
        restaurantId,
        steps,
        auditCtx(req),
      );
      return res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }
}

export const workflowController = new WorkflowController();
