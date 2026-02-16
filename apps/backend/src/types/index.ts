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
