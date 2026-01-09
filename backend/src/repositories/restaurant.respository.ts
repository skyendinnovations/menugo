import { eq } from "drizzle-orm";
import { db } from "../db";
import { restaurants } from "../db/schemas";
import type {
  CreateRestaurantDBInput,
  CreateRestaurantDTO,
} from "../types/restaurant.types";

class RestaurantRepository {
  async create(data: CreateRestaurantDBInput) {
    const [restaurant] = await db.insert(restaurants).values(data).returning();

    return restaurant;
  }

  async findById(id: number) {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));
    return restaurant;
  }

  async findAll() {
    const allRestaurants = await db.select().from(restaurants);
    return allRestaurants;
  }

  async update(id: number, data: CreateRestaurantDBInput) {
    const [restaurant] = await db
      .update(restaurants)
      .set(data)
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant;
  }

  async delete(id: number) {
    
    const [restaurant] = await db
      .delete(restaurants)
      .where(eq(restaurants.id, id))
      .returning();

    return restaurant;
  }
}

export const restaurantRepository = new RestaurantRepository();
