import { z } from "zod";
import { numericId, restaurantIdParams } from "./common";

const ORDER_STATUSES = [
  "received",
  "preparing",
  "ready",
  "served",
  "paid",
  "cancelled",
] as const;

// ─── Params ─────────────────────────────────────────────────────────

export const orderParams = restaurantIdParams;

export const orderIdParams = z
  .object({
    restaurantId: numericId,
    orderId: numericId,
  })
  .passthrough();

export const orderItemParams = z
  .object({
    restaurantId: numericId,
    orderId: numericId,
    itemId: numericId,
  })
  .passthrough();

// ─── Query ──────────────────────────────────────────────────────────

export const getOrdersQuery = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
  })
  .passthrough();

// ─── Bodies ─────────────────────────────────────────────────────────

export const updateOrderStatusBody = z.object({
  status: z.enum(ORDER_STATUSES, {
    message: `Status must be one of: ${ORDER_STATUSES.join(", ")}`,
  }),
});

export const voidOrderBody = z.object({
  reason: z.string().min(3).max(500),
});

export const updateOrderItemBody = z
  .object({
    quantity: z.number().int().min(1).optional(),
    remove: z.boolean().optional(),
  })
  .refine((data) => data.remove === true || data.quantity !== undefined, {
    message: "Provide a quantity or set remove=true",
  });
