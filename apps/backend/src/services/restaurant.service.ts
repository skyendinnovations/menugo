import { restaurantRepository } from "../repositories/restaurant.repository";
import { roleRepository } from "../repositories/role.repository";
import { workflowRepository } from "../repositories/workflow.repository";
import { notificationSettingsRepository } from "../repositories/notification-settings.repository";
import { memberRepository } from "../repositories/member.repository";
import { db } from "@menugo/data";
import { restaurants, restaurantMembers } from "@menugo/data/schemas";
import { eq } from "drizzle-orm";
import type {
  CreateRestaurantDBInput,
  CreateRestaurantDTO,
} from "../types/restaurant.types";
import { generateUniqueRestaurantSlug } from "../utils/helpers";
import { AppError } from "../types";

class RestaurantService {
  async createRestaurant(userId: string, payload: CreateRestaurantDTO) {
    // Staff members (non-owner) cannot create restaurants
    const existingMemberships = await memberRepository.findAllByUser(userId);
    const isStaffSomewhere = existingMemberships.some((m) => !m.isOwner);
    if (isStaffSomewhere) {
      throw new AppError(
        403,
        "Staff members cannot create restaurants. You must be removed from your current restaurant first.",
      );
    }

    const slug = await generateUniqueRestaurantSlug(payload.name);
    const dbInput: CreateRestaurantDBInput = { ...payload, slug };

    // create restaurant and add owner; neon-http driver does not support transactions,
    // so attempt owner insert and rollback restaurant on failure
    const createdRestaurant = await db
      .insert(restaurants)
      .values(dbInput)
      .returning()
      .then((r: any) => r[0]);

    if (!createdRestaurant || !createdRestaurant.id) {
      throw new Error("Failed to create restaurant");
    }

    try {
      // Seed all default roles for the restaurant
      const seededRoles = await roleRepository.seedDefaultRoles(createdRestaurant.id);
      // Build workflow transitions based on the seeded roles
      const roleNames = seededRoles.map((r: any) => r.name);
      await workflowRepository.rebuildForRoles(createdRestaurant.id, roleNames);
      // Seed default notification settings so roles receive order alerts
      await notificationSettingsRepository.seedDefaults(createdRestaurant.id);
      // Delegate owner insertion to repository helper
      await restaurantRepository.addRestaurantOwner(
        createdRestaurant.id,
        userId,
      );
    } catch (err) {
      // cleanup created restaurant if owner insert fails
      try {
        await db
          .delete(restaurants)
          .where(eq(restaurants.id, createdRestaurant.id));
      } catch (_) {
        // ignore cleanup errors
      }
      throw err;
    }

    return createdRestaurant;
  }

  async getRestaurantById(id: number) {
    const restaurant = await restaurantRepository.findById(id);

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    return restaurant;
  }

  async getAllRestaurants(userId: string) {
    return restaurantRepository.findByUserId(userId);
  }

  async updateRestaurant(id: number, payload: CreateRestaurantDTO) {
    const existing = await restaurantRepository.findById(id);
    if (!existing) throw new Error("Restaurant not found");
    const slug = existing.slug;

    const dbInput: CreateRestaurantDBInput = { ...payload, slug };
    return restaurantRepository.update(id, dbInput);
  }

  async deleteRestaurant(id: number) {
    const existing = await restaurantRepository.findById(id);
    if (!existing) throw new Error("Restaurant not found");
    return restaurantRepository.delete(id);
  }

  // async getMyRestaurants(userId: string) {

  //   const restaurants = await restaurantRepository.findByUserId(userId);

  //   if(!restaurants) throw new Error("No Restaurants found");

  //   return restaurants;
  // }
  async getOwnerByRestaurantId(id: number) {
    return restaurantRepository.getOwnerByRestaurantId(id);
  }
}

export const restaurantService = new RestaurantService();

// helper to expose owner lookup
// (added at bottom to keep class small; prefer calling restaurantService.getOwnerByRestaurantId)
