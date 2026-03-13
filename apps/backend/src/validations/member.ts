import { z } from "zod";
import { numericId, restaurantIdParams } from "./common";

// ─── Params ─────────────────────────────────────────────────────────

export const memberParams = restaurantIdParams;

export const memberIdParams = z
  .object({
    restaurantId: numericId,
    memberId: numericId,
  })
  .passthrough();

export const memberUserIdParams = z
  .object({
    restaurantId: numericId,
    userId: z.string().min(1, "User ID is required"),
  })
  .passthrough();

// ─── Bodies ─────────────────────────────────────────────────────────

export const inviteMemberBody = z.object({
  email: z.string().email("Invalid email address"),
  roleIds: z
    .array(z.number().int().positive())
    .min(1, "At least one role is required"),
});

export const updateMemberRolesBody = z.object({
  roleIds: z
    .array(z.number().int().positive())
    .min(1, "At least one role is required"),
});

export const acceptInvitationBody = z.object({
  token: z.string().min(1, "Token is required"),
});

export const rejectInvitationBody = z.object({
  token: z.string().min(1, "Token is required"),
});
