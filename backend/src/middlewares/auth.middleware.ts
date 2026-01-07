import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { AppError } from '../types';

// Mock authentication - replace with real JWT verification
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError(401, 'No token provided');
        }

        const token = authHeader.substring(7);

        // TODO: Implement JWT verification
        // const decoded = jwt.verify(token, config.jwt.secret);

        // Mock user for now
        (req as AuthRequest).user = {
            id: '1',
            email: 'user@example.com',
            role: 'user',
        };

        next();
    } catch (error) {
        next(new AppError(401, 'Invalid or expired token'));
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthRequest;

        if (!authReq.user) {
            return next(new AppError(401, 'Not authenticated'));
        }

        if (roles.length && !roles.includes(authReq.user.role)) {
            return next(new AppError(403, 'Insufficient permissions'));
        }

        next();
    };
};
