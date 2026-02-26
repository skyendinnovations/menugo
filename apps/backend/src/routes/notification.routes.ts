import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { validate } from "../middlewares/validate.middleware";
import { registerTokenBody, unregisterTokenBody } from "../validations";

const router = Router({ mergeParams: true });

router.post(
    "/register-token",
    validate({ body: registerTokenBody }),
    notificationController.registerToken.bind(notificationController)
);

router.delete(
    "/unregister-token",
    validate({ body: unregisterTokenBody }),
    notificationController.unregisterToken.bind(notificationController)
);

export default router;
