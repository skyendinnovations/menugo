import { z } from "zod";

/** Validates that a route param string is a positive integer. */
export const numericId = z
  .string()
  .regex(/^\d+$/, "Must be a valid numeric ID");

// ─── Reusable param schemas ─────────────────────────────────────────

export const restaurantIdParams = z
  .object({ restaurantId: numericId })
  .passthrough();
