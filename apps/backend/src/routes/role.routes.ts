import { Router } from "express";
import { roleController } from "../controllers/role.controller";
import { requirePermission } from "../middlewares/permission.middleware";
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
