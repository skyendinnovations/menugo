import { z } from "zod";
import { numericId, restaurantIdParams } from "./common";

// ─── Params ─────────────────────────────────────────────────────────

export const tableParams = restaurantIdParams;

export const tableIdParams = z
  .object({
    restaurantId: numericId,
    tableId: numericId,
  })
  .passthrough();

// ─── Bodies ─────────────────────────────────────────────────────────

export const createTableBody = z.object({
  tableNumber: z.number().int().positive("Table number must be positive"),
  capacity: z.number().int().positive().optional().default(4),
});

export const bulkCreateTablesBody = z
  .object({
    from: z.number().int().positive(),
    to: z.number().int().positive(),
    capacity: z.number().int().positive().optional().default(4),
  })
  .refine((data) => data.to >= data.from, {
    message: "'to' must be greater than or equal to 'from'",
    path: ["to"],
  });

export const updateTableBody = z.object({
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});
