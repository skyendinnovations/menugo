import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types";
import { resolvePermissions } from "../utils/resolve-permissions";
import type { PermissionKey } from "@menugo/dto";

// ─── Internal helper ────────────────────────────────────────────────────────

/**
 * Returns the cached `req.resolvedPermissions` if it was already computed
 * during this request, otherwise calls `resolvePermissions()` and stores the
 * result before returning it.
 *
 * This guarantees that the two DB queries in `resolvePermissions` are executed
 * **at most once per HTTP request**, even when several permission guards are
 * chained on the same route.
 */
async function getResolved(req: Request, restaurantId: number) {
  if (!req.resolvedPermissions) {
    req.resolvedPermissions = await resolvePermissions(
      req.user!.id,
      restaurantId,
    );
  }
  return req.resolvedPermissions;
}

// ─── Exported middleware factories ──────────────────────────────────────────

/**
 * Requires the authenticated user to hold **all** of the listed permissions
 * in the restaurant identified by `req.params.restaurantId`.
 *
 * Super-admins and restaurant owners bypass the permission check.
 */
export const requirePermission = (...permissions: PermissionKey[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError(401, "Not authenticated"));
      }

      const restaurantId = Number(req.params.restaurantId);
      if (!restaurantId || isNaN(restaurantId)) {
        return next(new AppError(400, "Invalid restaurant ID"));
      }

      const resolved = await getResolved(req, restaurantId);

      // Super-admins and owners have unrestricted access.
      if (resolved.isSuperAdmin || resolved.isOwner) {
        return next();
      }

      if (!resolved.isMember) {
        return next(
          new AppError(403, "You are not a member of this restaurant"),
        );
      }

      const hasAll = permissions.every(
        (p) => resolved.permissions[p] === true,
      );
      if (!hasAll) {
        return next(
          new AppError(403, "Insufficient permissions for this action"),
        );
      }

      next();
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(500, "Permission check failed"),
      );
    }
  };
};

/**
 * Requires the authenticated user to hold **at least one** of the listed
 * permissions. Useful for endpoints accessible by multiple roles (e.g. a
 * kitchen view reachable by anyone with `view_orders` OR `prepare_orders`).
 *
 * Super-admins and restaurant owners bypass the permission check.
 */
export const requireAnyPermission = (...permissions: PermissionKey[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError(401, "Not authenticated"));
      }

      const restaurantId = Number(req.params.restaurantId);
      if (!restaurantId || isNaN(restaurantId)) {
        return next(new AppError(400, "Invalid restaurant ID"));
      }

      const resolved = await getResolved(req, restaurantId);

      // Super-admins and owners have unrestricted access.
      if (resolved.isSuperAdmin || resolved.isOwner) {
        return next();
      }

      if (!resolved.isMember) {
        return next(
          new AppError(403, "You are not a member of this restaurant"),
        );
      }

      const hasAny = permissions.some((p) => resolved.permissions[p] === true);
      if (!hasAny) {
        return next(
          new AppError(403, "Insufficient permissions for this action"),
        );
      }

      next();
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError(500, "Permission check failed"),
      );
    }
  };
};

/**
 * Requires the authenticated user to be an active member of the restaurant
 * (any role). Does **not** check specific permissions — use
 * `requirePermission` or `requireAnyPermission` for that.
 *
 * Super-admins bypass the membership check.
 */
export const requireMembership = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(new AppError(401, "Not authenticated"));
    }

    const restaurantId = Number(req.params.restaurantId);
    if (!restaurantId || isNaN(restaurantId)) {
      return next(new AppError(400, "Invalid restaurant ID"));
    }

    const resolved = await getResolved(req, restaurantId);

    if (resolved.isSuperAdmin || resolved.isMember) {
      return next();
    }

    next(new AppError(403, "You are not a member of this restaurant"));
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(500, "Membership check failed"),
    );
  }
};

