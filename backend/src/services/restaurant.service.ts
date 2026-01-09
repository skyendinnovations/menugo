import { restaurantRepository } from "../repositories/restaurant.repository";
import { db } from "../db";
import { restaurants } from "../db/schemas";
import { restaurantMembers } from "../db/schemas/restaurant-member.schema";
import { eq } from "drizzle-orm";
import type {
  CreateRestaurantDBInput,
  CreateRestaurantDTO,
} from "../types/restaurant.types";
import { generateUniqueRestaurantSlug } from "../utils/helpers";

class RestaurantService {
  async createRestaurant(userId: string, payload: CreateRestaurantDTO) {

    const slug = await generateUniqueRestaurantSlug(payload.name);
    const dbInput: CreateRestaurantDBInput = { ...payload, slug };

    // create restaurant and add owner; neon-http driver does not support transactions,
    // so attempt owner insert and rollback restaurant on failure
    const createdRestaurant = await db.insert(restaurants).values(dbInput).returning().then((r: any) => r[0]);

    if (!createdRestaurant || !createdRestaurant.id) {
      throw new Error("Failed to create restaurant");
    }

    try {
      // Delegate owner insertion to repository helper
      await restaurantRepository.addRestaurantOwner(createdRestaurant.id, userId);
    } catch (err) {
      // cleanup created restaurant if owner insert fails
      try {
        await db.delete(restaurants).where(eq(restaurants.id, createdRestaurant.id));
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

  async getAllRestaurants() {
    return restaurantRepository.findAll();
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
