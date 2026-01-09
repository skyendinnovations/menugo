import { eq } from "drizzle-orm";
import { db } from "../db";
import { restaurants } from "../db/schemas";
import { restaurantMembers } from "../db/schemas/restaurant-member.schema";
import type {
  CreateRestaurantDBInput,
  CreateRestaurantDTO,
} from "../types/restaurant.types";

class RestaurantRepository {
  async create(data: CreateRestaurantDBInput) {
    const [restaurant] = await db.insert(restaurants).values(data).returning();

    return restaurant;
  }

  async addRestaurantOwner(restaurantId: number, userId: string) {
    await db
      .insert(restaurantMembers)
      .values({ restaurantId, userId, isOwner: true });
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

  // async findByUserId(userId: string) {
  //   const restaurantsForUser = await db
  //   .select({
  //     id: restaurants.id,
  //     name: restaurants.name,
  //     slug: restaurants.slug,
  //     description: restaurants.description,
  //     address: restaurants.address,
  //     phone: restaurants.phone,
  //     email: restaurants.email,
  //     website: restaurants.website,
  //     logo: restaurants.logo,
  //     tableCountRange: restaurants.tableCountRange,
  //     workersCount: restaurants.workersCount,
  //     seatingCapacity: restaurants.seatingCapacity,
  //     workflowSettings: restaurants.workflowSettings,
  //     operatingHours: restaurants.operatingHours,
  //     isActive: restaurants.isActive,
  //     createdAt: restaurants.createdAt,
  //     updatedAt: restaurants.updatedAt,
  //     isOwner: restaurantMembers.isOwner,
  //     joinedAt: restaurantMembers.joinedAt,
  //   })
  //   .from(restaurantMembers)
  //   .innerJoin(
  //     restaurants,
  //     eq(restaurantMembers.restaurantId, restaurants.id)
  //   )
  //   .where(eq(restaurantMembers.userId, userId));

  //   return restaurantsForUser;
  // }
}

export const restaurantRepository = new RestaurantRepository();
