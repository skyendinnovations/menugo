import { z } from "zod";

const TABLE_COUNT_RANGES = [
  "under_10",
  "10_to_20",
  "20_to_40",
  "40_to_50",
] as const;

export const createRestaurantBody = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).nullish(),
  address: z.string().max(500).nullish(),
  phone: z.string().max(50).nullish(),
  email: z.string().email("Invalid email").nullish(),
  website: z.string().url("Invalid URL").max(500).nullish(),
  currency: z.string().min(3).max(3).nullish(),
  tableCountRange: z.enum(TABLE_COUNT_RANGES).nullish(),
  workersCount: z.number().int().positive().nullish(),
  seatingCapacity: z.number().int().positive().nullish(),
  workflowSettings: z
    .object({
      hasKitchenView: z.boolean().optional(),
      orderFlow: z.array(z.string()).optional(),
    })
    .nullish(),
});

export const updateRestaurantBody = createRestaurantBody.partial();

export const restaurantIdParam = z
  .object({
    id: z.string().regex(/^\d+$/, "Invalid restaurant ID"),
  })
  .passthrough();
