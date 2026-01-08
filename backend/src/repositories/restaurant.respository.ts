import { db } from "../db";
import { restaurants } from "../db/schemas";
import type { CreateRestaurantDBInput, CreateRestaurantDTO } from "../types/restaurant.types";

class RestaurantRepository {
    async create(data: CreateRestaurantDBInput)
    {
        
        const [restaurant] = await db
        .insert(restaurants).values(data).returning();

        return restaurant;
    }

}

export const restaurantRepository = new RestaurantRepository();