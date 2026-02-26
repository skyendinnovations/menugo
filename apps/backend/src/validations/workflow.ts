import { z } from "zod";
import { numericId } from "./common";

// ─── Workflow Mode ──────────────────────────────────────────────────

export const updateWorkflowModeBody = z.object({
  workflowMode: z.enum(["full_service", "fast_service", "self_service"]),
});

// ─── Workflow Transitions ───────────────────────────────────────────

const ORDER_STATUSES = ["received", "preparing", "ready", "served", "paid", "cancelled"] as const;

export const workflowTransitionItem = z.object({
  fromState: z.enum(ORDER_STATUSES, { message: `Must be one of: ${ORDER_STATUSES.join(", ")}` }),
  toState: z.enum(ORDER_STATUSES, { message: `Must be one of: ${ORDER_STATUSES.join(", ")}` }),
  requiredPermission: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateWorkflowsBody = z.object({
  transitions: z
    .array(workflowTransitionItem)
    .min(1, "At least one transition is required"),
});

// ─── Notification History Query ─────────────────────────────────────

export const notificationHistoryQuery = z
  .object({
    orderId: numericId.optional(),
    eventType: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .passthrough();
