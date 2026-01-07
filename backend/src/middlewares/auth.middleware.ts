
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { AppError } from '../types';
import { auth } from '../../auth';
import { fromNodeHeaders } from 'better-auth/node';

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Use Better Auth's session validation
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session || !session.user) {
            throw new AppError(401, 'Invalid or expired session');
        }

        // Attach user to request
        (req as AuthRequest).user = {
            id: session.user.id,
            email: session.user.email,
            role: (session.user as any).role || 'user',
        };

        next();
    } catch (error) {
        next(error instanceof AppError ? error : new AppError(401, 'Authentication failed'));
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
