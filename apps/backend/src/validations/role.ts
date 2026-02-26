import { z } from "zod";
import { numericId, restaurantIdParams } from "./common";
import { PERMISSION_KEY_SET } from "@menugo/dto";

const permissionsObject = z
  .record(z.string(), z.boolean())
  .refine(
    (val) => Object.keys(val).every((key) => PERMISSION_KEY_SET.has(key)),
    { message: "Contains invalid permission key(s)" },
  );

// ─── Params ─────────────────────────────────────────────────────────

export const roleParams = restaurantIdParams;

export const roleIdParams = z
  .object({
    restaurantId: numericId,
    roleId: numericId,
  })
  .passthrough();

// ─── Bodies ─────────────────────────────────────────────────────────

export const createRoleBody = z.object({
  name: z.string().min(1, "Name is required").max(100),
  permissions: permissionsObject.optional().default({}),
});

export const updateRoleBody = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: permissionsObject.optional(),
  isActive: z.boolean().optional(),
});

export const updatePermissionsBody = z.object({
  permissions: permissionsObject,
});
