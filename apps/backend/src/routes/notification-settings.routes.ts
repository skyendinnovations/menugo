import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

router.get(
    "/",
    requirePermission("manage_restaurant"),
    notificationController.getSettings.bind(notificationController)
);

router.put(
    "/",
    requirePermission("manage_restaurant"),
    notificationController.updateSettings.bind(notificationController)
);

router.post(
    "/seed",
    requirePermission("manage_restaurant"),
    notificationController.seedDefaults.bind(notificationController)
);

export default router;
