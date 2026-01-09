import { eq } from "drizzle-orm";
import { db } from "../db";
import { restaurants } from "../db/schemas";
import { restaurantMembers } from "../db/schemas/restaurant-member.schema";
import { roles } from "../db/schemas/role.schema";
import { userRoles } from "../db/schemas/user-role.schema";
import type {
    CreateRestaurantDBInput,
} from "../types/restaurant.types";

class RestaurantRepository {
    async create(data: CreateRestaurantDBInput) {
        const [restaurant] = await db.insert(restaurants).values(data).returning();

        return restaurant;
    }

    async addRestaurantOwner(restaurantId: number, userId: string) {
        // insert restaurant member row
        await db.insert(restaurantMembers).values({ restaurantId, userId, isOwner: true });

        // ensure an 'owner' role exists for this restaurant
        const [existingRole] = await db
            .select()
            .from(roles)
            .where(eq(roles.restaurantId, restaurantId))
            .where(eq(roles.name, 'owner'));

        let roleId: number;
        if (existingRole && existingRole.id) {
            roleId = existingRole.id;
        } else {
            const [newRole] = await db.insert(roles).values({ restaurantId, name: 'owner', permissions: {} }).returning();
            roleId = newRole.id;
        }

        // map user to role for this restaurant
        const [ur] = await db.insert(userRoles).values({ userId, roleId, restaurantId }).returning();

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
            .where(eq(roles.restaurantId, id))
            .where(eq(roles.name, 'owner'));

        if (!ownerRole || !ownerRole.id) {
            return null;
        }

        const [userRole] = await db
            .select()
            .from(userRoles)
            .where(eq(userRoles.roleId, ownerRole.id))
            .where(eq(userRoles.restaurantId, id));

        // resolved owner via role mapping

        return userRole?.userId ?? null;
    }
}

export const restaurantRepository = new RestaurantRepository();
