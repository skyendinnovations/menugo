import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types";
import { auth } from "../../auth";
import { fromNodeHeaders } from "better-auth/node";
import { db } from "../db";
import { session as sessionTable, user as userTable } from "../db/schemas/auth.schema";
import { eq } from "drizzle-orm";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    // During tests, if an Authorization header with a test token is provided,
    // look up the session in the local DB and attach the corresponding user.
    if (process.env.NODE_ENV === 'test') {
      const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        try {
          const [sess] = await db.select().from(sessionTable).where(eq(sessionTable.token, token));
          if (sess) {
            const [u] = await db.select().from(userTable).where(eq(userTable.id, sess.userId));
            if (u) {
              req.user = { id: u.id, email: u.email, role: u.role };
              return next();
            }
          }
        } catch (e) {
          // fallthrough to normal auth error handling
        }
      }
      // if no valid test token or lookup failed, reject authentication
      return next(new AppError(401, 'Authentication failed (test token missing or invalid)'));
    }

    // Use Better Auth's session validation
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return next(new AppError(401, "Authentication failed"));
    }

    // Attach user to request with safe role extraction
    const hasRole = (u: unknown): u is { role: string } =>
      !!u && typeof u === "object" && "role" in (u as object) && typeof (u as any).role === "string";

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: hasRole(session.user) ? session.user.role : "user",
    };

    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(401, "Authentication failed")
    );
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Not authenticated"));
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return next(new AppError(403, "Insufficient permissions"));
    }

    next();
  };
};
