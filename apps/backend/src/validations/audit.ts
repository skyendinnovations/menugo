import { z } from "zod";
import { restaurantIdParams } from "./common";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@menugo/dto";

// ─── Params ─────────────────────────────────────────────────────────

export const auditParams = restaurantIdParams;

// ─── Query ──────────────────────────────────────────────────────────

export const getAuditLogsQuery = z
  .object({
    action: z.enum(AUDIT_ACTIONS).optional(),
    entityType: z.enum(AUDIT_ENTITIES).optional(),
    entityId: z.string().min(1).optional(),
    actorUserId: z.string().min(1).optional(),
    startDate: z
      .string()
      .datetime({ message: "startDate must be ISO 8601" })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: "endDate must be ISO 8601" })
      .optional(),
    page: z
      .string()
      .regex(/^\d+$/, "page must be a positive integer")
      .optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "limit must be a positive integer")
      .optional(),
  })
  .passthrough();
