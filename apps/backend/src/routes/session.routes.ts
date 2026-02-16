import { Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requirePermission("view_orders"),
  sessionController.getSessions.bind(sessionController),
);

router.get(
  "/:sessionId",
  requirePermission("view_orders"),
  sessionController.getSession.bind(sessionController),
);

router.post(
  "/:sessionId/close",
  requirePermission("close_sessions"),
  sessionController.closeSession.bind(sessionController),
);

export default router;
