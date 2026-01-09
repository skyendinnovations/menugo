import { count, eq } from "drizzle-orm";
import { db } from "../db";
import { restaurants } from "../db/schemas";
import {sonare} from "sonare";

export const asyncHandler = (
    fn: Function
) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateId = () => crypto.randomUUID();

export const sanitizeEmail = (email: string) => email.toLowerCase().trim();

export const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const getSlugFromDisplayName = (displayName: string) => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export const isRestaurantSlugAvailable = async (slug: string) => {
  const result = await db
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);

  return result.length === 0;
};



export const generateUniqueRestaurantSlug = async (displayName: string) => {
  const baseSlug = getSlugFromDisplayName(displayName);
  let slug = baseSlug;

  for (let i = 0; i < 5; i++) {
    if (await isRestaurantSlugAvailable(slug)) {
      return slug;
    }
    slug = `${baseSlug}-${sonare()}`;
  }

  throw new Error("Restaurant name is already taken");
};

