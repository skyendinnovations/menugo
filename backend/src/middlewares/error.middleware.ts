import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { logger } from '../utils/logger';
import { errorResponse } from '../utils/response';
import { isDevelopment } from '../config';

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
    });

    if (err instanceof AppError) {
        return errorResponse(res, err.message, err.statusCode);
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return errorResponse(res, err.message, 400);
    }

    // Handle database errors
    if (err.name === 'DatabaseError') {
        return errorResponse(res, 'Database error occurred', 500);
    }

    // Default error
    const message = isDevelopment ? err.message : 'Internal server error';
    return errorResponse(res, message, 500);
};

export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const error = new AppError(404, `Route ${req.originalUrl} not found`);
    next(error);
};
