import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types";
import { db } from "@menugo/data";
import { userRoles, roles, user as userTable } from "@menugo/data/schemas";
import { eq, and } from "drizzle-orm";
import type { PermissionKey, Permissions } from "@menugo/dto";

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

      // Super admin bypasses all permission checks (tenant isolation override)
      const [superAdminRecord] = await db
        .select({ isSuperAdmin: userTable.isSuperAdmin })
        .from(userTable)
        .where(eq(userTable.id, req.user.id))
        .limit(1);
      if (superAdminRecord?.isSuperAdmin) {
        return next();
      }

      // Get all roles for this user in this restaurant
      const userRoleEntries = await db
        .select({
          roleId: userRoles.roleId,
          roleName: roles.name,
          permissions: roles.permissions,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(userRoles.userId, req.user.id),
            eq(userRoles.restaurantId, restaurantId),
          ),
        );

      if (userRoleEntries.length === 0) {
        return next(
          new AppError(403, "You are not a member of this restaurant"),
        );
      }

      // Check if any role has owner (owner has all permissions)
      const isOwner = userRoleEntries.some((r) => r.roleName === "owner");
      if (isOwner) {
        return next();
      }

      // Merge all permissions from all user roles
      const mergedPermissions: Permissions = {};
      for (const entry of userRoleEntries) {
        const perms = (entry.permissions || {}) as Permissions;
        for (const [key, value] of Object.entries(perms)) {
          if (value) {
            mergedPermissions[key as PermissionKey] = true;
          }
        }
      }

      // Check if user has all required permissions
      const hasAll = permissions.every((p) => mergedPermissions[p] === true);
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

// Middleware that only requires the user to be a member of the restaurant (any role)
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

    // Super admin bypasses membership check (tenant isolation override)
    const [superAdminRecord] = await db
      .select({ isSuperAdmin: userTable.isSuperAdmin })
      .from(userTable)
      .where(eq(userTable.id, req.user.id))
      .limit(1);
    if (superAdminRecord?.isSuperAdmin) {
      return next();
    }

    const [entry] = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, req.user.id),
          eq(userRoles.restaurantId, restaurantId),
        ),
      )
      .limit(1);

    if (!entry) {
      return next(new AppError(403, "You are not a member of this restaurant"));
    }

    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(500, "Membership check failed"),
    );
  }
};
