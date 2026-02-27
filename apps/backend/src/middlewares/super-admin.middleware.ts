import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types";
import { db } from "@menugo/data";
import { user as userTable } from "@menugo/data/schemas";
import { eq } from "drizzle-orm";

/**
 * Middleware that requires the authenticated user to be a super admin.
 * Checks the `isSuperAdmin` flag on the user record in the database.
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(new AppError(401, "Not authenticated"));
    }

    const [record] = await db
      .select({ isSuperAdmin: userTable.isSuperAdmin })
      .from(userTable)
      .where(eq(userTable.id, req.user.id))
      .limit(1);

    if (!record || !record.isSuperAdmin) {
      return next(new AppError(403, "Super admin access required"));
    }

    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(500, "Super admin check failed"),
    );
  }
};

/**
 * Helper to check if a user is a super admin.
 * Used by permission / membership middleware for tenant isolation override.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const [record] = await db
    .select({ isSuperAdmin: userTable.isSuperAdmin })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return record?.isSuperAdmin === true;
}
