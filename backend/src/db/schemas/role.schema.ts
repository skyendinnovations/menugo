import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { user } from "./auth.schema";
import { restaurantInvitations } from "./invitation.schema";

export const roles = pgTable("roles", {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
        .references(() => restaurants.id, { onDelete: "cascade" })
        .notNull(),

    name: text("name").notNull(),
    permissions: jsonb("permissions").notNull().default({}),

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const rolesRelations = relations(roles, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [roles.restaurantId],
        references: [restaurants.id],
    }),
    users: many(user),
    invitations: many(restaurantInvitations),
}));
