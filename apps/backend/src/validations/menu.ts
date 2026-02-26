import { z } from "zod";
import { numericId, restaurantIdParams } from "./common";

const PRICE_REGEX = /^\d+(\.\d{1,2})?$/;

// ─── Params ─────────────────────────────────────────────────────────

export const menuParams = restaurantIdParams;

export const categoryIdParams = z
  .object({
    restaurantId: numericId,
    categoryId: numericId,
  })
  .passthrough();

export const itemIdParams = z
  .object({
    restaurantId: numericId,
    itemId: numericId,
  })
  .passthrough();

export const variantIdParams = z
  .object({
    restaurantId: numericId,
    variantId: numericId,
  })
  .passthrough();

export const itemVariantParams = z
  .object({
    restaurantId: numericId,
    itemId: numericId,
  })
  .passthrough();

// ─── Category Bodies ────────────────────────────────────────────────

export const createCategoryBody = z.object({
  name: z.string().min(1, "Name is required").max(255),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateCategoryBody = z.object({
  name: z.string().min(1).max(255).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ─── Item Bodies ────────────────────────────────────────────────────

const variantSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.string().regex(PRICE_REGEX, "Invalid price format"),
});

export const createItemBody = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).nullish(),
  price: z.string().regex(PRICE_REGEX, "Invalid price format"),
  isVeg: z.boolean().optional(),
  imagePath: z.string().max(500).nullish(),
  hasVariants: z.boolean().optional(),
  variants: z.array(variantSchema).optional(),
});

export const updateItemBody = z.object({
  categoryId: z.number().int().positive().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullish(),
  price: z.string().regex(PRICE_REGEX, "Invalid price format").optional(),
  isVeg: z.boolean().optional(),
  imagePath: z.string().max(500).nullish(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  hasVariants: z.boolean().optional(),
});

// ─── Variant Bodies ─────────────────────────────────────────────────

export const createVariantBody = variantSchema;

export const updateVariantBody = z.object({
  name: z.string().min(1).max(255).optional(),
  price: z.string().regex(PRICE_REGEX, "Invalid price format").optional(),
  isActive: z.boolean().optional(),
});

// ─── Stock Bodies ───────────────────────────────────────────────────

export const setStockBody = z.object({
  stockCount: z.number().int().min(0).nullable(),
});

export const toggleSoldOutBody = z.object({
  isSoldOut: z.boolean(),
});
