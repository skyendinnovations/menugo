import type { InferInsertModel } from "drizzle-orm";
import type { restaurants } from "@menugo/data/schemas";

type RestaurantInsertBase = InferInsertModel<typeof restaurants>;

export type CreateRestaurantDTO = Omit<RestaurantInsertBase, "slug">;
export type CreateRestaurantDBInput = RestaurantInsertBase;
