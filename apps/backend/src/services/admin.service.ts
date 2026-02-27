import { adminRepository } from "../repositories/admin.repository";
import { auditService } from "./audit.service";
import { AppError } from "../types";
import type { PaginationParams } from "@menugo/dto";

class AdminService {
  // ─── Restaurant management ──────────────────────────────────────

  async listRestaurants(
    pagination: PaginationParams,
    filters: { status?: string; search?: string } = {},
  ) {
    return adminRepository.findAllRestaurants(pagination, filters);
  }

  async getRestaurant(id: number) {
    const restaurant = await adminRepository.findRestaurantById(id);
    if (!restaurant) {
      throw new AppError(404, "Restaurant not found");
    }
    return restaurant;
  }

  async suspendRestaurant(
    id: number,
    reason: string,
    actorUserId: string,
  ) {
    const restaurant = await adminRepository.findRestaurantById(id);
    if (!restaurant) {
      throw new AppError(404, "Restaurant not found");
    }
    if (!restaurant.isActive) {
      throw new AppError(400, "Restaurant is already suspended");
    }

    const updated = await adminRepository.suspendRestaurant(id);

    auditService
      .log({
        restaurantId: id,
        actorUserId,
        action: "restaurant_suspended",
        entityType: "restaurant",
        entityId: id,
        oldValue: { isActive: true },
        newValue: { isActive: false },
        reason,
      })
      .catch(() => {});

    return updated;
  }

  async activateRestaurant(
    id: number,
    reason: string | undefined,
    actorUserId: string,
  ) {
    const restaurant = await adminRepository.findRestaurantById(id);
    if (!restaurant) {
      throw new AppError(404, "Restaurant not found");
    }
    if (restaurant.isActive) {
      throw new AppError(400, "Restaurant is already active");
    }

    const updated = await adminRepository.activateRestaurant(id);

    auditService
      .log({
        restaurantId: id,
        actorUserId,
        action: "restaurant_activated",
        entityType: "restaurant",
        entityId: id,
        oldValue: { isActive: false },
        newValue: { isActive: true },
        reason: reason || null,
      })
      .catch(() => {});

    return updated;
  }

  // ─── User management ───────────────────────────────────────────

  async listUsers(
    pagination: PaginationParams,
    filters: { status?: string; search?: string } = {},
  ) {
    return adminRepository.findAllUsers(pagination, filters);
  }

  async getUser(id: string) {
    const user = await adminRepository.findUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return user;
  }

  async banUser(id: string, reason: string, actorUserId: string) {
    const user = await adminRepository.findUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    if (user.banned) {
      throw new AppError(400, "User is already banned");
    }
    if (user.isSuperAdmin) {
      throw new AppError(400, "Cannot ban a super admin");
    }

    const updated = await adminRepository.banUser(id);

    auditService
      .log({
        restaurantId: 0,
        actorUserId,
        action: "user_banned",
        entityType: "user",
        entityId: id,
        oldValue: { banned: false },
        newValue: { banned: true },
        reason,
      })
      .catch(() => {});

    return updated;
  }

  async unbanUser(id: string, reason: string | undefined, actorUserId: string) {
    const user = await adminRepository.findUserById(id);
    if (!user) {
      throw new AppError(404, "User not found");
    }
    if (!user.banned) {
      throw new AppError(400, "User is not banned");
    }

    const updated = await adminRepository.unbanUser(id);

    auditService
      .log({
        restaurantId: 0,
        actorUserId,
        action: "user_unbanned",
        entityType: "user",
        entityId: id,
        oldValue: { banned: true },
        newValue: { banned: false },
        reason: reason || null,
      })
      .catch(() => {});

    return updated;
  }

  // ─── Platform stats ─────────────────────────────────────────────

  async getPlatformStats() {
    return adminRepository.getPlatformStats();
  }
}

export const adminService = new AdminService();
