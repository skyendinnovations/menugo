import type { InferInsertModel } from "drizzle-orm";
import type { restaurants } from "../db/schemas";

type RestaurantInsertBase = InferInsertModel<typeof restaurants>;

export type CreateRestaurantDTO = Omit<RestaurantInsertBase,"slug">;
export type CreateRestaurantDBInput = RestaurantInsertBase;