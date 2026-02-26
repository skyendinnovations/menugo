import { z } from "zod";
import { numericId } from "./common";

// ─── Params ─────────────────────────────────────────────────────────

export const fileIdParams = z
  .object({
    fileId: numericId,
  })
  .passthrough();

export const entityParams = z
  .object({
    entityType: z.string().min(1, "entityType is required"),
    entityId: z.string().min(1, "entityId is required"),
  })
  .passthrough();

// ─── Bodies ─────────────────────────────────────────────────────────

export const uploadFileBody = z.object({
  entityType: z.enum(["restaurant", "menu_item", "user"], {
    message: "entityType must be restaurant, menu_item, or user",
  }),
  entityId: z.string().min(1, "entityId is required"),
  purpose: z.string().max(100).optional(),
});
