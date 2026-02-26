import { z } from "zod";

// ─── Query ──────────────────────────────────────────────────────────

export const getStatusQuery = z
  .object({
    restaurantId: z
      .string()
      .regex(/^\d+$/, "restaurantId is required and must be numeric"),
  })
  .passthrough();

export const callbackQuery = z
  .object({
    subscription_id: z.string().min(1, "subscription_id is required"),
    status: z.string().min(1, "status is required"),
  })
  .passthrough();

// ─── Bodies ─────────────────────────────────────────────────────────

export const checkoutUrlBody = z.object({
  restaurantId: z.number().int().positive(),
  planSlug: z.string().min(1, "planSlug is required"),
  interval: z.enum(["monthly", "yearly"], {
    message: "interval must be 'monthly' or 'yearly'",
  }),
});
