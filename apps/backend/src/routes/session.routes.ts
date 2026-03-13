import { Router } from "express";
import { sessionController } from "../controllers/session.controller";
import { requirePermission, requireAnyPermission } from "../middlewares/permission.middleware";
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
  requireAnyPermission("view_orders", "close_sessions", "helper_block_table", "table_force_release"),
  sessionController.getSessions.bind(sessionController),
);

router.get(
  "/:sessionId",
  validate({ params: sessionIdParams }),
  requireAnyPermission("view_orders", "close_sessions"),
  sessionController.getSession.bind(sessionController),
);

router.post(
  "/:sessionId/close",
  validate({ params: sessionIdParams }),
  requirePermission("close_sessions"),
  sessionController.closeSession.bind(sessionController),
);

export default router;
