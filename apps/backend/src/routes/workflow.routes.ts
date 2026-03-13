import { Router } from "express";
import { workflowController } from "../controllers/workflow.controller";
import {
  requirePermission,
  requireMembership,
} from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { restaurantIdParams, updateWorkflowsBody } from "../validations";

const router = Router({ mergeParams: true });

router.get(
  "/",
  validate({ params: restaurantIdParams }),
  requirePermission("manage_workflows"),
  workflowController.getWorkflows.bind(workflowController),
);

/**
 * Mobile-facing order flow endpoint.
 *
 * Returns `{ transitions: Record<string, string | null>, statuses: string[] }`
 * for the `useWorkflow` hook. Any authenticated member may call this — no
 * specific operational permission is required.
 */
router.get(
  "/flow",
  validate({ params: restaurantIdParams }),
  requireMembership,
  workflowController.getFlow.bind(workflowController),
);

// Active order flow (statuses + transitions) — any member with view_orders
router.get(
  "/order-flow",
  validate({ params: restaurantIdParams }),
  requirePermission("view_orders"),
  workflowController.getOrderFlow.bind(workflowController),
);

// Flow config for the visual workflow editor
router.get(
  "/flow-config",
  validate({ params: restaurantIdParams }),
  requirePermission("manage_workflows"),
  workflowController.getFlowConfig.bind(workflowController),
);

router.put(
  "/flow-config",
  validate({ params: restaurantIdParams }),
  requirePermission("manage_workflows"),
  workflowController.saveFlowConfig.bind(workflowController),
);

router.put(
  "/",
  validate({ params: restaurantIdParams, body: updateWorkflowsBody }),
  requirePermission("manage_workflows"),
  workflowController.updateWorkflows.bind(workflowController),
);

export default router;
