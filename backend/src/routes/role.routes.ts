import { Router } from "express";
import { roleController } from "../controllers/role.controller";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requirePermission("manage_roles"),
  roleController.getRoles.bind(roleController)
);

router.post(
  "/",
  requirePermission("manage_roles"),
  roleController.createRole.bind(roleController)
);

router.put(
  "/:roleId",
  requirePermission("manage_roles"),
  roleController.updateRole.bind(roleController)
);

router.delete(
  "/:roleId",
  requirePermission("manage_roles"),
  roleController.deleteRole.bind(roleController)
);

export default router;
