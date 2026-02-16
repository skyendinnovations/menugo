import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";
import { roles } from "./role.schema";
import { restaurants } from "./restaurant.schema";

export const userRoles = pgTable(
    "user_roles",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .references(() => user.id, { onDelete: "cascade" })
            .notNull(),
        roleId: integer("role_id")
            .references(() => roles.id, { onDelete: "cascade" })
            .notNull(),
        restaurantId: integer("restaurant_id")
            .references(() => restaurants.id, { onDelete: "cascade" })
            .notNull(),

        assignedAt: timestamp("assigned_at").defaultNow().notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("user_roles_user_idx").on(table.userId),
        index("user_roles_restaurant_idx").on(table.restaurantId),
    ]
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
    user: one(user, {
        fields: [userRoles.userId],
        references: [user.id],
    }),
    role: one(roles, {
        fields: [userRoles.roleId],
        references: [roles.id],
    }),
    restaurant: one(restaurants, {
        fields: [userRoles.restaurantId],
        references: [restaurants.id],
    }),
}));
