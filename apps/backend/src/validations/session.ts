import { z } from "zod";
import { numericId, restaurantIdParams } from "./common";

// ─── Params ─────────────────────────────────────────────────────────

export const sessionParams = restaurantIdParams;

export const sessionIdParams = z
  .object({
    restaurantId: numericId,
    sessionId: numericId,
  })
  .passthrough();

// ─── Query ──────────────────────────────────────────────────────────

export const getSessionsQuery = z
  .object({
    active: z.enum(["true", "false"]).optional(),
  })
  .passthrough();
