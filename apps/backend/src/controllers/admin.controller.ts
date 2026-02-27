import type { Request, Response, NextFunction } from "express";
import { adminService } from "../services/admin.service";
import { successResponse, paginatedResponse } from "../utils/response";

export class AdminController {
  // ─── Platform stats ─────────────────────────────────────────────

  async getPlatformStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getPlatformStats();
      return successResponse(res, stats, "Platform stats retrieved");
    } catch (error) {
      next(error);
    }
  }

  // ─── Restaurant management ──────────────────────────────────────

  async listRestaurants(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = (req.query.status as string) || "all";
      const search = req.query.q as string | undefined;

      const { data, total } = await adminService.listRestaurants(
        { page, limit },
        { status, search },
      );

      return paginatedResponse(res, data, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async getRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const restaurant = await adminService.getRestaurant(id);
      return successResponse(res, restaurant, "Restaurant retrieved");
    } catch (error) {
      next(error);
    }
  }

  async suspendRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const { reason } = req.body;
      const actorUserId = req.user!.id;

      const restaurant = await adminService.suspendRestaurant(
        id,
        reason,
        actorUserId,
      );

      return successResponse(res, restaurant, "Restaurant suspended");
    } catch (error) {
      next(error);
    }
  }

  async activateRestaurant(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const { reason } = req.body;
      const actorUserId = req.user!.id;

      const restaurant = await adminService.activateRestaurant(
        id,
        reason,
        actorUserId,
      );

      return successResponse(res, restaurant, "Restaurant activated");
    } catch (error) {
      next(error);
    }
  }

  // ─── User management ───────────────────────────────────────────

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = (req.query.status as string) || "all";
      const search = req.query.q as string | undefined;

      const { data, total } = await adminService.listUsers(
        { page, limit },
        { status, search },
      );

      return paginatedResponse(res, data, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const user = await adminService.getUser(id);
      return successResponse(res, user, "User retrieved");
    } catch (error) {
      next(error);
    }
  }

  async banUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { reason } = req.body;
      const actorUserId = req.user!.id;

      const user = await adminService.banUser(id, reason, actorUserId);
      return successResponse(res, user, "User banned");
    } catch (error) {
      next(error);
    }
  }

  async unbanUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const { reason } = req.body;
      const actorUserId = req.user!.id;

      const user = await adminService.unbanUser(id, reason, actorUserId);
      return successResponse(res, user, "User unbanned");
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
