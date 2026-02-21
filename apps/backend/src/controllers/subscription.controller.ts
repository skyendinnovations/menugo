import type { Request, Response, NextFunction } from "express";
import { subscriptionService } from "../services/subscription.service";
import { successResponse } from "../utils/response";
import type { AuthRequest } from "../types";
import { AppError } from "../types";

export class SubscriptionController {
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await subscriptionService.getPlans();
      return successResponse(res, plans, "Plans retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        throw new AppError(401, "User not authenticated");
      }

      const restaurantId = Number(req.query.restaurantId);
      if (!restaurantId || isNaN(restaurantId)) {
        throw new AppError(400, "restaurantId query parameter is required");
      }

      const status =
        await subscriptionService.getSubscriptionStatus(restaurantId);
      return successResponse(
        res,
        status,
        "Subscription status retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  async getCheckoutUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        throw new AppError(401, "User not authenticated");
      }

      const { restaurantId, planSlug, interval } = req.body;

      if (!restaurantId || isNaN(Number(restaurantId))) {
        throw new AppError(400, "restaurantId is required");
      }

      if (!planSlug || typeof planSlug !== "string") {
        throw new AppError(400, "planSlug is required");
      }

      if (!interval || !["monthly", "yearly"].includes(interval)) {
        throw new AppError(400, "interval must be 'monthly' or 'yearly'");
      }

      const url = await subscriptionService.generateCheckoutUrl(
        Number(restaurantId),
        planSlug,
        interval as "monthly" | "yearly",
      );

      return successResponse(res, { url }, "Checkout URL generated");
    } catch (error) {
      next(error);
    }
  }

  async handleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { subscription_id, status } = req.query;

      if (!subscription_id || !status) {
        throw new AppError(400, "Missing subscription_id or status");
      }

      const result = await subscriptionService.handleCallback(
        subscription_id as string,
        status as string,
      );

      return successResponse(res, result, "Callback processed");
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
