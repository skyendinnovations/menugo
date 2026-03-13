import { roleRepository } from "../repositories/role.repository";
import { notificationSettingsRepository } from "../repositories/notification-settings.repository";
import { workflowRepository } from "../repositories/workflow.repository";
import { auditService } from "./audit.service";
import { AppError } from "../types";
import {
  type CreateRoleDTO,
  type UpdateRoleDTO,
  type Permissions,
  DEFAULT_ROLE_TEMPLATES,
} from "@menugo/dto";
import { logger } from "../utils/logger";

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

    // If no permissions were provided, apply defaults from known templates
    let permissions = dto.permissions;
    const isEmpty =
      !permissions || Object.keys(permissions).length === 0;
    if (isEmpty) {
      const template = DEFAULT_ROLE_TEMPLATES.find(
        (t) => t.name.toLowerCase() === dto.name.toLowerCase().trim(),
      );
      permissions = template
        ? { ...template.permissions }
        : { view_orders: true, update_orders: true };
    }

    const role = await roleRepository.create(
      restaurantId,
      dto.name,
      permissions,
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

    // Auto-rebuild workflows & notifications based on updated role set
    this.rebuildWorkflowsAndNotifications(restaurantId).catch((err) =>
      logger.error("Failed to rebuild workflows after role creation", err),
    );

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

    // Auto-rebuild workflows & notifications based on remaining roles
    // (CASCADE already removed the deleted role's notification_settings &
    //  user_roles rows, but we need to rebuild workflow transitions to skip
    //  steps that no longer have a responsible role.)
    await this.rebuildWorkflowsAndNotifications(role.restaurantId);

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

  /**
   * Rebuild workflow transitions AND notification settings based on the
   * roles that currently exist for a restaurant.
   *
   * Called automatically whenever a role is created or deleted so that
   * the order flow, statuses, and notifications adapt dynamically.
   */
  async rebuildWorkflowsAndNotifications(restaurantId: number) {
    const allRoles = await roleRepository.findByRestaurant(restaurantId);
    const roleNames = allRoles.map((r) => r.name);

    // Rebuild workflow transitions (e.g., skip preparing/ready when no kitchen)
    await workflowRepository.rebuildForRoles(restaurantId, roleNames);

    // Re-seed notification settings for the remaining roles
    await notificationSettingsRepository.seedDefaults(restaurantId);

    logger.info("Rebuilt workflows & notifications", {
      restaurantId,
      roles: roleNames,
    });
  }
}

export const roleService = new RoleService();
