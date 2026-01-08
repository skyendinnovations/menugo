import { pgTable, serial, text, boolean, timestamp, jsonb, pgEnum, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";
import { roles } from "./role.schema";
import { restaurantTables } from "./table.schema";
import { menuCategories } from "./menu.schema";
import { tableSessions } from "./session.schema";
import { restaurantInvitations } from "./invitation.schema";

// Table count range enum
export const tableCountRangeEnum = pgEnum("table_count_range", [
    "under_10",
    "10_to_20",
    "20_to_40",
    "40_to_50",
]);

export const restaurants = pgTable("restaurants", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),

    // Restaurant details
    description: text("description"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    logo: text("logo"),

    // Capacity information
    tableCountRange: tableCountRangeEnum("table_count_range"),
    workersCount: integer("workers_count"),
    seatingCapacity: integer("seating_capacity"),

    workflowSettings: jsonb("workflow_settings").notNull().default({
        hasKitchenView: true,
        orderFlow: ["received", "preparing", "ready", "served", "paid"],
    }),

    // Operating hours
    operatingHours: jsonb("operating_hours"),

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
    roles: many(roles),
    tables: many(restaurantTables),
    menuCategories: many(menuCategories),
    sessions: many(tableSessions),
    invitations: many(restaurantInvitations),
}));
