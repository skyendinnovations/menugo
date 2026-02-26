import { Router } from "express";
import { auditController } from "../controllers/audit.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { requireSubscription } from "../middlewares/subscription.middleware";
import { validate } from "../middlewares/validate.middleware";
import { auditParams, getAuditLogsQuery } from "../validations";

const router = Router({ mergeParams: true });

router.get(
  "/",
  validate({ params: auditParams, query: getAuditLogsQuery }),
  requireSubscription("professional"),
  requirePermission("view_audit_log"),
  auditController.getLogs.bind(auditController),
);

export default router;
