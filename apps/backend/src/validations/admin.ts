import { z } from "zod";

// ─── Admin param schemas ────────────────────────────────────────────

export const adminRestaurantIdParams = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "Must be a valid numeric ID"),
});

export const adminUserIdParams = z.object({
  id: z.string().min(1, "User ID is required"),
});

// ─── Admin body schemas ─────────────────────────────────────────────

export const suspendRestaurantBody = z.object({
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
});

export const activateRestaurantBody = z.object({
  reason: z.string().max(500).optional(),
});

export const adminBanUserBody = z.object({
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
});

export const adminUnbanUserBody = z.object({
  reason: z.string().max(500).optional(),
});

// ─── Admin query schemas ────────────────────────────────────────────

export const adminListQuery = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  q: z.string().optional(),
});

export const adminRestaurantListQuery = adminListQuery.extend({
  status: z.enum(["all", "active", "suspended"]).optional().default("all"),
});

export const adminUserListQuery = adminListQuery.extend({
  status: z
    .enum(["all", "active", "banned"])
    .optional()
    .default("all"),
});
