import { pgTable, serial, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";
import { roles } from "./role.schema";
import { restaurantTables } from "./table.schema";
import { menuCategories } from "./menu.schema";
import { tableSessions } from "./session.schema";
import { restaurantInvitations } from "./invitation.schema";

export const restaurants = pgTable("restaurants", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),

    workflowSettings: jsonb("workflow_settings").notNull().default({
        hasKitchenView: true,
        orderFlow: ["received", "preparing", "ready", "served", "paid"],
    }),

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
    users: many(user),
    roles: many(roles),
    tables: many(restaurantTables),
    menuCategories: many(menuCategories),
    sessions: many(tableSessions),
    invitations: many(restaurantInvitations),
}));
