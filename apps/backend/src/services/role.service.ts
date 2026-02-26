import { roleRepository } from "../repositories/role.repository";
import { auditService } from "./audit.service";
import { AppError } from "../types";
import type { CreateRoleDTO, UpdateRoleDTO, Permissions } from "@menugo/dto";

/** Contextual info passed from the controller for audit logging. */
interface AuditContext {
  actorUserId: string;
  ipAddress?: string;
}

class RoleService {
  async getRolesByRestaurant(restaurantId: number) {
    return roleRepository.findByRestaurant(restaurantId);
  }

  async getRoleById(id: number) {
    const role = await roleRepository.findById(id);
    if (!role) throw new AppError(404, "Role not found");
    return role;
  }

  async createRole(
    restaurantId: number,
    dto: CreateRoleDTO,
    ctx?: AuditContext,
  ) {
    const existing = await roleRepository.findByName(restaurantId, dto.name);
    if (existing) {
      throw new AppError(409, `Role '${dto.name}' already exists`);
    }
    const role = await roleRepository.create(
      restaurantId,
      dto.name,
      dto.permissions,
    );

    if (ctx && role) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "role_created",
          entityType: "role",
          entityId: role.id,
          newValue: { name: role.name, permissions: role.permissions },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    return role;
  }

  async updateRole(id: number, dto: UpdateRoleDTO, ctx?: AuditContext) {
    const role = await roleRepository.findById(id);
    if (!role) throw new AppError(404, "Role not found");

    if (role.name === "owner" && dto.name && dto.name !== "owner") {
      throw new AppError(400, "Cannot rename the owner role");
    }

    const updated = await roleRepository.update(id, dto);

    if (ctx && updated) {
      auditService
        .log({
          restaurantId: role.restaurantId,
          actorUserId: ctx.actorUserId,
          action: "role_updated",
          entityType: "role",
          entityId: id,
          oldValue: { name: role.name, permissions: role.permissions },
          newValue: { name: updated.name, permissions: updated.permissions },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    return updated;
  }

  async deleteRole(id: number, ctx?: AuditContext) {
    const role = await roleRepository.findById(id);
    if (!role) throw new AppError(404, "Role not found");

    if (role.name === "owner") {
      throw new AppError(400, "Cannot delete the owner role");
    }

    const deleted = await roleRepository.delete(id);

    if (ctx) {
      auditService
        .log({
          restaurantId: role.restaurantId,
          actorUserId: ctx.actorUserId,
          action: "role_deleted",
          entityType: "role",
          entityId: id,
          oldValue: { name: role.name, permissions: role.permissions },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    return deleted;
  }

  async updatePermissions(
    roleId: number,
    restaurantId: number,
    permissions: Permissions,
    ctx?: AuditContext,
  ) {
    const role = await roleRepository.findById(roleId);
    if (!role) throw new AppError(404, "Role not found");

    if (role.restaurantId !== restaurantId) {
      throw new AppError(404, "Role not found in this restaurant");
    }

    if (role.name === "owner") {
      throw new AppError(400, "Cannot modify owner role permissions");
    }

    const updated = await roleRepository.update(roleId, { permissions });

    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "permission_changed",
          entityType: "role",
          entityId: roleId,
          oldValue: role.permissions,
          newValue: permissions,
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    return updated;
  }

  async seedDefaultRoles(restaurantId: number) {
    return roleRepository.seedDefaultRoles(restaurantId);
  }
}

export const roleService = new RoleService();
