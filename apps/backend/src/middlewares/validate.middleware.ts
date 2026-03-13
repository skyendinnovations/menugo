import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types";

interface ValidationSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

/**
 * Express middleware that validates request body, params, and/or query
 * against Zod schemas. Validation runs before any business logic.
 *
 * - **params**: validated for format only (Express params stay as strings)
 * - **query**: parsed and merged back (allows coercion, e.g. string → number)
 * - **body**: parsed and replaced (sanitizes input, strips unknown keys)
 */
export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        schemas.params.parse(req.params);
      }

      if (schemas.query) {
        schemas.query.parse(req.query);
      }

      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      next();
    } catch (error: unknown) {
      // Handle ZodError (check for .issues array — works across Zod versions)
      if (error && typeof error === "object" && "issues" in error) {
        const issues = (
          error as {
            issues: Array<{ path?: (string | number)[]; message: string }>;
          }
        ).issues;
        const messages = issues.map((issue) => {
          const path =
            issue.path && issue.path.length > 0
              ? issue.path.join(".")
              : "value";
          return `${path}: ${issue.message}`;
        });
        return next(
          new AppError(400, `Validation failed: ${messages.join("; ")}`),
        );
      }

      if (error instanceof Error) {
        return next(new AppError(400, error.message));
      }

      return next(new AppError(400, "Validation failed"));
    }
  };
};
