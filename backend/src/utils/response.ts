import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '../types';

export const successResponse = <T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200
) => {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message,
    };
    return res.status(statusCode).json(response);
};

export const errorResponse = (
    res: Response,
    error: string,
    statusCode = 500
) => {
    const response: ApiResponse = {
        success: false,
        error,
    };
    return res.status(statusCode).json(response);
};

export const paginatedResponse = <T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
) => {
    const response: PaginatedResponse<T> = {
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
    return res.status(200).json(response);
};
