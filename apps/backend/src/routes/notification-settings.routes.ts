import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { requireSubscription } from "../middlewares/subscription.middleware";
import { validate } from "../middlewares/validate.middleware";
import { notificationParams, updateSettingsBody } from "../validations";

const router = Router({ mergeParams: true });

router.get(
    "/",
    validate({ params: notificationParams }),
    requireSubscription("professional"),
    requirePermission("manage_restaurant"),
    notificationController.getSettings.bind(notificationController)
);

router.put(
    "/",
    validate({ params: notificationParams, body: updateSettingsBody }),
    requireSubscription("professional"),
    requirePermission("manage_restaurant"),
    notificationController.updateSettings.bind(notificationController)
);

router.post(
    "/seed",
    validate({ params: notificationParams }),
    requireSubscription("professional"),
    requirePermission("manage_restaurant"),
    notificationController.seedDefaults.bind(notificationController)
);

export default router;
