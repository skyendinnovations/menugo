import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import {
  restaurants,
  restaurantMembers,
  roles,
  userRoles,
} from "@menugo/data/schemas";
import type { CreateRestaurantDBInput } from "../types/restaurant.types";

class RestaurantRepository {
  async create(data: CreateRestaurantDBInput) {
    const [restaurant] = await db.insert(restaurants).values(data).returning();

    return restaurant;
  }

  async addRestaurantOwner(restaurantId: number, userId: string) {
    // insert restaurant member row
    await db
      .insert(restaurantMembers)
      .values({ restaurantId, userId, isOwner: true });

    // ensure an 'owner' role exists for this restaurant
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(
        and(eq(roles.restaurantId, restaurantId), eq(roles.name, "owner")),
      );

    let roleId: number;
    if (existingRole && existingRole.id) {
      roleId = existingRole.id;
    } else {
      const [newRole] = await db
        .insert(roles)
        .values({ restaurantId, name: "owner", permissions: {} })
        .returning();
      roleId = newRole!.id;
    }

    // map user to role for this restaurant
    const [ur] = await db
      .insert(userRoles)
      .values({ userId, roleId, restaurantId })
      .returning();

    // insertion completed
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

  async findByUserId(userId: string) {
    const result = await db
      .select({ restaurant: restaurants })
      .from(restaurants)
      .innerJoin(
        restaurantMembers,
        eq(restaurantMembers.restaurantId, restaurants.id),
      )
      .where(eq(restaurantMembers.userId, userId));
    return result.map((r) => r.restaurant);
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

  async getOwnerByRestaurantId(id: number) {
    // Prefer resolving owner via roles + user_roles mapping to avoid ambiguity.
    const [ownerRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.restaurantId, id), eq(roles.name, "owner")));

    if (!ownerRole || !ownerRole.id) {
      return null;
    }

    const [userRole] = await db
      .select()
      .from(userRoles)
      .where(
        and(eq(userRoles.roleId, ownerRole.id), eq(userRoles.restaurantId, id)),
      );

    // resolved owner via role mapping

    return userRole?.userId ?? null;
  }

  async updateWorkflowMode(id: number, workflowMode: string) {
    const [restaurant] = await db
      .update(restaurants)
      .set({ workflowMode, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant;
  }
}

export const restaurantRepository = new RestaurantRepository();
