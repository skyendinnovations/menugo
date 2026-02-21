import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  monthlyAmount: integer("monthly_amount").notNull().default(0), // in paise
  yearlyAmount: integer("yearly_amount").notNull().default(0), // in paise
  currency: text("currency").notNull().default("INR"),
  features: jsonb("features").notNull().default([]),
  limits: jsonb("limits").notNull().default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
