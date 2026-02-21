import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types";
import { subscriptionService } from "../services/subscription.service";

const PLAN_HIERARCHY = ["starter", "professional", "enterprise"] as const;

export const requireSubscription = (minPlan?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError(401, "Not authenticated"));
      }

      const restaurantId = Number(req.params.restaurantId);
      if (!restaurantId || isNaN(restaurantId)) {
        return next(new AppError(400, "Invalid restaurant ID"));
      }

      const status =
        await subscriptionService.getSubscriptionStatus(restaurantId);

      if (!status.active && !status.planSlug) {
        // No subscription — allow starter (free) tier access
        if (!minPlan || minPlan === "starter") {
          req.subscription = {
            planSlug: "starter",
            active: true,
            interval: null,
            expiresAt: null,
          };
          return next();
        }
        return next(
          new AppError(
            403,
            "An active subscription is required to access this feature",
          ),
        );
      }

      // If a minimum plan is specified, check hierarchy
      if (minPlan) {
        const currentIndex = PLAN_HIERARCHY.indexOf(
          (status.planSlug ?? "starter") as (typeof PLAN_HIERARCHY)[number],
        );
        const requiredIndex = PLAN_HIERARCHY.indexOf(
          minPlan as (typeof PLAN_HIERARCHY)[number],
        );

        if (currentIndex < requiredIndex) {
          return next(
            new AppError(
              403,
              `This feature requires the ${minPlan} plan or higher`,
            ),
          );
        }
      }

      req.subscription = {
        planSlug: status.planSlug ?? "starter",
        active: status.active,
        interval: status.interval,
        expiresAt: status.expiresAt,
      };

      next();
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(500, "Subscription check failed"),
      );
    }
  };
};
