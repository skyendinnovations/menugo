import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { successResponse, paginatedResponse } from '../utils/response';
import type { AuthRequest } from '../types';

export class UserController {
    async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const { data, total } = await userService.getAllUsers({ page, limit });

            return paginatedResponse(res, data, page, limit, total);
        } catch (error) {
            next(error);
        }
    }

    async getUserById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new Error('User ID is required');
            }
            const user = await userService.getUserById(id);

            return successResponse(res, user, 'User retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async createUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, password } = req.body;
            const user = await userService.createUser({ name, email, password });

            return successResponse(res, user, 'User created successfully', 201);
        } catch (error) {
            next(error);
        }
    }

    async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new Error('User ID is required');
            }
            const user = await userService.updateUser(id, req.body);

            return successResponse(res, user, 'User updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new Error('User ID is required');
            }
            const result = await userService.deleteUser(id);

            return successResponse(res, result, 'User deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async searchUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const query = req.query.q as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            if (!query) {
                return this.getUsers(req, res, next);
            }

            const { data, total } = await userService.searchUsers(query, { page, limit });

            return paginatedResponse(res, data, page, limit, total);
        } catch (error) {
            next(error);
        }
    }

    async getCurrentUser(req: Request, res: Response, next: NextFunction) {
        try {
            const authReq = req as AuthRequest;
            const userId = authReq.user?.id;

            if (!userId) {
                throw new Error('User not authenticated');
            }

            const user = await userService.getUserById(userId);

            return successResponse(res, user, 'Current user retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async banUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new Error('User ID is required');
            }
            const user = await userService.banUser(id);

            return successResponse(res, user, 'User banned successfully');
        } catch (error) {
            next(error);
        }
    }

    async unbanUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new Error('User ID is required');
            }
            const user = await userService.unbanUser(id);

            return successResponse(res, user, 'User unbanned successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const userController = new UserController();
