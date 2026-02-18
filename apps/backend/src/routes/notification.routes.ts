import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";

const router = Router({ mergeParams: true });

router.post(
    "/register-token",
    notificationController.registerToken.bind(notificationController)
);

router.delete(
    "/unregister-token",
    notificationController.unregisterToken.bind(notificationController)
);

export default router;
