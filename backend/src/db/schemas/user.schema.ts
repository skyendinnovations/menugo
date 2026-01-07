import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { roles } from "./role.schema";
import { orders } from "./order.schema";
import { tableSessions } from "./session.schema";
import { restaurantInvitations } from "./invitation.schema";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id").references(() => restaurants.id, {
        onDelete: "cascade",
    }),
    roleId: integer("role_id").references(() => roles.id, {
        onDelete: "set null",
    }),

    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),

    isSuperAdmin: boolean("is_super_admin").default(false),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [users.restaurantId],
        references: [restaurants.id],
    }),
    role: one(roles, {
        fields: [users.roleId],
        references: [roles.id],
    }),
    createdOrders: many(orders),
    endedSessions: many(tableSessions),
    sentInvitations: many(restaurantInvitations),
}));
