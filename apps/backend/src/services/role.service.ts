import { roleRepository } from "../repositories/role.repository";
import { AppError } from "../types";
import type { CreateRoleDTO, UpdateRoleDTO } from "@menugo/dto";

class RoleService {
  async getRolesByRestaurant(restaurantId: number) {
    return roleRepository.findByRestaurant(restaurantId);
  }

  async getRoleById(id: number) {
    const role = await roleRepository.findById(id);
    if (!role) throw new AppError(404, "Role not found");
    return role;
  }

  async createRole(restaurantId: number, dto: CreateRoleDTO) {
    const existing = await roleRepository.findByName(restaurantId, dto.name);
    if (existing) {
      throw new AppError(409, `Role '${dto.name}' already exists`);
    }
    return roleRepository.create(restaurantId, dto.name, dto.permissions);
  }

  async updateRole(id: number, dto: UpdateRoleDTO) {
    const role = await roleRepository.findById(id);
    if (!role) throw new AppError(404, "Role not found");

    if (role.name === "owner" && dto.name && dto.name !== "owner") {
      throw new AppError(400, "Cannot rename the owner role");
    }

    return roleRepository.update(id, dto);
  }

  async deleteRole(id: number) {
    const role = await roleRepository.findById(id);
    if (!role) throw new AppError(404, "Role not found");

    if (role.name === "owner") {
      throw new AppError(400, "Cannot delete the owner role");
    }

    return roleRepository.delete(id);
  }

  async seedDefaultRoles(restaurantId: number) {
    return roleRepository.seedDefaultRoles(restaurantId);
  }
}

export const roleService = new RoleService();
