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
