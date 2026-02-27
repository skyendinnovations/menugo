import { db } from "@menugo/data";
import {
  restaurants,
  user as userTable,
} from "@menugo/data/schemas";
import { eq, desc, count, like, or, and, sql } from "drizzle-orm";
import type { PaginationParams } from "@menugo/dto";

export class AdminRepository {
  // ─── Restaurant queries ─────────────────────────────────────────

  async findAllRestaurants(
    pagination: PaginationParams,
    filters: { status?: string; search?: string } = {},
  ) {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.status === "active") {
      conditions.push(eq(restaurants.isActive, true));
    } else if (filters.status === "suspended") {
      conditions.push(eq(restaurants.isActive, false));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(restaurants.name, pattern),
          like(restaurants.slug, pattern),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          slug: restaurants.slug,
          description: restaurants.description,
          email: restaurants.email,
          phone: restaurants.phone,
          currency: restaurants.currency,
          isActive: restaurants.isActive,
          createdAt: restaurants.createdAt,
          updatedAt: restaurants.updatedAt,
          memberCount:
            sql<number>`(SELECT count(*)::int FROM restaurant_members WHERE restaurant_id = ${restaurants.id})`,
          tableCount:
            sql<number>`(SELECT count(*)::int FROM restaurant_tables WHERE restaurant_id = ${restaurants.id})`,
          orderCount:
            sql<number>`(SELECT count(*)::int FROM orders WHERE restaurant_id = ${restaurants.id})`,
        })
        .from(restaurants)
        .where(where)
        .orderBy(desc(restaurants.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(restaurants)
        .where(where),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  }

  async findRestaurantById(id: number) {
    const [restaurant] = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        description: restaurants.description,
        email: restaurants.email,
        phone: restaurants.phone,
        currency: restaurants.currency,
        isActive: restaurants.isActive,
        createdAt: restaurants.createdAt,
        updatedAt: restaurants.updatedAt,
        memberCount:
          sql<number>`(SELECT count(*)::int FROM restaurant_members WHERE restaurant_id = ${restaurants.id})`,
        tableCount:
          sql<number>`(SELECT count(*)::int FROM restaurant_tables WHERE restaurant_id = ${restaurants.id})`,
        orderCount:
          sql<number>`(SELECT count(*)::int FROM orders WHERE restaurant_id = ${restaurants.id})`,
      })
      .from(restaurants)
      .where(eq(restaurants.id, id));

    return restaurant || null;
  }

  async suspendRestaurant(id: number) {
    const [restaurant] = await db
      .update(restaurants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();

    return restaurant || null;
  }

  async activateRestaurant(id: number) {
    const [restaurant] = await db
      .update(restaurants)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();

    return restaurant || null;
  }

  // ─── User queries ───────────────────────────────────────────────

  async findAllUsers(
    pagination: PaginationParams,
    filters: { status?: string; search?: string } = {},
  ) {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.status === "banned") {
      conditions.push(eq(userTable.banned, true));
    } else if (filters.status === "active") {
      conditions.push(eq(userTable.banned, false));
    }
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(userTable.name, pattern),
          like(userTable.email, pattern),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          image: userTable.image,
          banned: userTable.banned,
          isSuperAdmin: userTable.isSuperAdmin,
          isActive: userTable.isActive,
          createdAt: userTable.createdAt,
          restaurantCount:
            sql<number>`(SELECT count(*)::int FROM restaurant_members WHERE user_id = ${userTable.id})`,
        })
        .from(userTable)
        .where(where)
        .orderBy(desc(userTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(userTable)
        .where(where),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  }

  async findUserById(id: string) {
    const [record] = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
        banned: userTable.banned,
        isSuperAdmin: userTable.isSuperAdmin,
        isActive: userTable.isActive,
        createdAt: userTable.createdAt,
        restaurantCount:
          sql<number>`(SELECT count(*)::int FROM restaurant_members WHERE user_id = ${userTable.id})`,
      })
      .from(userTable)
      .where(eq(userTable.id, id));

    return record || null;
  }

  async banUser(id: string) {
    const [record] = await db
      .update(userTable)
      .set({ banned: true, updatedAt: new Date() })
      .where(eq(userTable.id, id))
      .returning();

    return record || null;
  }

  async unbanUser(id: string) {
    const [record] = await db
      .update(userTable)
      .set({ banned: false, updatedAt: new Date() })
      .where(eq(userTable.id, id))
      .returning();

    return record || null;
  }

  // ─── Platform stats ─────────────────────────────────────────────

  async getPlatformStats() {
    const [restaurantStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) FILTER (WHERE ${restaurants.isActive} = true)`,
        suspended: sql<number>`count(*) FILTER (WHERE ${restaurants.isActive} = false)`,
      })
      .from(restaurants);

    const [userStats] = await db
      .select({
        total: count(),
        banned: sql<number>`count(*) FILTER (WHERE ${userTable.banned} = true)`,
      })
      .from(userTable);

    const [orderStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(sql`orders`);

    return {
      totalRestaurants: restaurantStats?.total || 0,
      activeRestaurants: Number(restaurantStats?.active) || 0,
      suspendedRestaurants: Number(restaurantStats?.suspended) || 0,
      totalUsers: userStats?.total || 0,
      bannedUsers: Number(userStats?.banned) || 0,
      totalOrders: Number(orderStats?.total) || 0,
    };
  }
}

export const adminRepository = new AdminRepository();
