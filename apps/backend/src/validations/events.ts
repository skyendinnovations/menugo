import { z } from "zod";
import { restaurantIdParams } from "./common";

// ─── Params ─────────────────────────────────────────────────────────

export const eventsParams = restaurantIdParams;

// ─── Query ──────────────────────────────────────────────────────────

export const pollEventsQuery = z.object({
  since: z
    .string()
    .min(1, "'since' is required")
    .refine((v) => !isNaN(new Date(v).getTime()), {
      message: "'since' must be a valid ISO-8601 timestamp",
    }),
});
