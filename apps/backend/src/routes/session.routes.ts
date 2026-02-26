import { Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  sessionParams,
  sessionIdParams,
  getSessionsQuery,
} from "../validations";

const router = Router({ mergeParams: true });

router.get(
  "/",
  validate({ params: sessionParams, query: getSessionsQuery }),
  requirePermission("view_orders"),
  sessionController.getSessions.bind(sessionController),
);

router.get(
  "/:sessionId",
  validate({ params: sessionIdParams }),
  requirePermission("view_orders"),
  sessionController.getSession.bind(sessionController),
);

router.post(
  "/:sessionId/close",
  validate({ params: sessionIdParams }),
  requirePermission("close_sessions"),
  sessionController.closeSession.bind(sessionController),
);

export default router;
