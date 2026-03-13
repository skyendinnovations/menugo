import { Router } from "express";
import { roleController } from "../controllers/role.controller";
import {
  requirePermission,
  requireMembership,
} from "../middlewares/permission.middleware";
import { requireSubscription } from "../middlewares/subscription.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  roleParams,
  roleIdParams,
  createRoleBody,
  updateRoleBody,
  updatePermissionsBody,
} from "../validations";

const router = Router({ mergeParams: true });

/**
 * Return the built-in role templates (Kitchen, Cashier, Waiter, …).
 * Only membership is required — any staff member can view templates so the
 * create-role form can suggest starting points.
 */
router.get(
  "/templates",
  validate({ params: roleParams }),
  requireSubscription("professional"),
  requireMembership,
  roleController.getTemplates.bind(roleController),
);

router.get(
  "/",
  validate({ params: roleParams }),
  requireSubscription("professional"),
  requirePermission("manage_roles"),
  roleController.getRoles.bind(roleController),
);

router.post(
  "/",
  validate({ params: roleParams, body: createRoleBody }),
  requireSubscription("professional"),
  requirePermission("manage_roles"),
  roleController.createRole.bind(roleController),
);

router.put(
  "/:roleId",
  validate({ params: roleIdParams, body: updateRoleBody }),
  requireSubscription("professional"),
  requirePermission("manage_roles"),
  roleController.updateRole.bind(roleController),
);

router.put(
  "/:roleId/permissions",
  validate({ params: roleIdParams, body: updatePermissionsBody }),
  requireSubscription("professional"),
  requirePermission("manage_roles"),
  roleController.updatePermissions.bind(roleController),
);

router.delete(
  "/:roleId",
  validate({ params: roleIdParams }),
  requireSubscription("professional"),
  requirePermission("manage_roles"),
  roleController.deleteRole.bind(roleController),
);

export default router;
