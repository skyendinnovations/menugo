import { z } from "zod";
import { numericId } from "./common";

// ─── Params ─────────────────────────────────────────────────────────

export const slugParam = z
  .object({
    slug: z.string().min(1, "Restaurant slug is required"),
  })
  .passthrough();

export const slugTableParam = z
  .object({
    slug: z.string().min(1, "Restaurant slug is required"),
    tableNumber: numericId,
  })
  .passthrough();

export const publicSessionIdParam = z
  .object({
    sessionId: numericId,
  })
  .passthrough();

// ─── Query ──────────────────────────────────────────────────────────

export const tableInfoQuery = z
  .object({
    deviceId: z.string().optional(),
  })
  .passthrough();

// ─── Bodies ─────────────────────────────────────────────────────────

export const createSessionBody = z.object({
  deviceId: z.string().min(1, "deviceId is required"),
  personsCount: z.number().int().positive().optional().default(1),
  customerName: z.string().max(255).optional(),
});

export const joinSessionBody = z.object({
  joinCode: z.string().min(1, "joinCode is required"),
  deviceId: z.string().min(1, "deviceId is required"),
  participantName: z.string().max(255).optional(),
});

const orderItemSchema = z.object({
  menuItemId: z.number().int().positive(),
  variantName: z.string().max(255).optional(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().max(500).optional(),
});

export const placeOrderBody = z.object({
  deviceId: z.string().min(1, "deviceId is required"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  notes: z.string().max(500).optional(),
});
