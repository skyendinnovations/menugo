import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { roles } from "./role.schema";
import { user } from "./auth.schema";

export const invitationStatusEnum = pgEnum("invitation_status", [
    "pending",
    "accepted",
    "expired",
]);

export const restaurantInvitations = pgTable("restaurant_invitations", {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
        .references(() => restaurants.id, { onDelete: "cascade" })
        .notNull(),
    roleId: integer("role_id")
        .references(() => roles.id, { onDelete: "cascade" })
        .notNull(),

    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    inviterId: text("inviter_id").references(() => user.id, {
        onDelete: "set null",
    }),

    status: invitationStatusEnum("status").default("pending"),

    // Email tracking fields
    sentAt: timestamp("sent_at"),
    resentCount: integer("resent_count").default(0),
    lastResentAt: timestamp("last_resent_at"),

    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

export const restaurantInvitationsRelations = relations(
    restaurantInvitations,
    ({ one }) => ({
        restaurant: one(restaurants, {
            fields: [restaurantInvitations.restaurantId],
            references: [restaurants.id],
        }),
        role: one(roles, {
            fields: [restaurantInvitations.roleId],
            references: [roles.id],
        }),
        inviter: one(user, {
            fields: [restaurantInvitations.inviterId],
            references: [user.id],
        }),
    })
);
