import { Router } from "express";
import { workflowController } from "../controllers/workflow.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { restaurantIdParams, updateWorkflowsBody } from "../validations";

const router = Router({ mergeParams: true });

router.get(
  "/",
  validate({ params: restaurantIdParams }),
  requirePermission("manage_workflows"),
  workflowController.getWorkflows.bind(workflowController),
);

router.put(
  "/",
  validate({ params: restaurantIdParams, body: updateWorkflowsBody }),
  requirePermission("manage_workflows"),
  workflowController.updateWorkflows.bind(workflowController),
);

export default router;
