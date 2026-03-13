import type { Request } from "express";

// Re-export shared types from @menugo/dto for backward compatibility
export type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from "@menugo/dto";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Contextual metadata passed from controllers into service methods for
 * audit-log attribution.  All fields are optional so callers that don't
 * have (or need) the context can simply omit it.
 */
export interface AuditContext {
  actorUserId: string;
  ipAddress?: string;
}
