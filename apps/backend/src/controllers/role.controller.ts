import type { Request, Response, NextFunction } from "express";
import { roleService } from "../services/role.service";

/** Extract audit context from Express request. */
function auditCtx(req: Request) {
  return {
    actorUserId: req.user!.id,
    ipAddress: req.ip ?? (req.headers["x-forwarded-for"] as string) ?? null,
  };
}

class RoleController {
  async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const roles = await roleService.getRolesByRestaurant(restaurantId);
      return res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { name, permissions } = req.body;

      if (!name || typeof name !== "string") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or missing 'name'" });
      }

      const role = await roleService.createRole(
        restaurantId,
        { name, permissions: permissions || {} },
        auditCtx(req),
      );
      return res.status(201).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.roleId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid role ID" });
      }

      const role = await roleService.updateRole(id, req.body, auditCtx(req));
      return res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async updatePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const roleId = Number(req.params.roleId);
      const { permissions } = req.body;

      const role = await roleService.updatePermissions(
        roleId,
        restaurantId,
        permissions,
        auditCtx(req),
      );
      return res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.roleId);
      if (!id || isNaN(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid role ID" });
      }

      await roleService.deleteRole(id, auditCtx(req));
      return res.json({ success: true, message: "Role deleted" });
    } catch (error) {
      next(error);
    }
  }
}

export const roleController = new RoleController();
