import type { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notification.service";

class NotificationController {
    async registerToken(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const { token, deviceType, deviceName } = req.body;

            if (!token || !deviceType) {
                return res.status(400).json({
                    success: false,
                    message: "token and deviceType are required",
                });
            }

            await notificationService.registerToken(
                userId,
                token,
                deviceType,
                deviceName
            );
            return res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    async unregisterToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: "token is required",
                });
            }

            await notificationService.unregisterToken(token);
            return res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    async getSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const restaurantId = Number(req.params.restaurantId);
            const matrix =
                await notificationService.getSettingsMatrix(restaurantId);
            return res.json({ success: true, data: matrix });
        } catch (error) {
            next(error);
        }
    }

    async updateSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const restaurantId = Number(req.params.restaurantId);
            const { settings } = req.body;

            if (!Array.isArray(settings)) {
                return res.status(400).json({
                    success: false,
                    message: "settings must be an array",
                });
            }

            await notificationService.updateSettings(restaurantId, settings);
            return res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }

    async seedDefaults(req: Request, res: Response, next: NextFunction) {
        try {
            const restaurantId = Number(req.params.restaurantId);
            await notificationService.seedDefaults(restaurantId);
            return res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
}

export const notificationController = new NotificationController();
