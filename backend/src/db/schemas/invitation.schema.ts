import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { roles } from "./role.schema";
import { user } from "./auth.schema";

export const invitationStatusEnum = pgEnum("invitation_status", [
    "pending",
    "accepted",
    "rejected",
    "expired",
]);

export const restaurantInvitations = pgTable("restaurant_invitations", {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
        .references(() => restaurants.id, { onDelete: "cascade" })
        .notNull(),

    // Store role IDs as array since a user can be invited with multiple roles
    roleIds: integer("role_ids").array().notNull(),

    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    inviterId: text("inviter_id").references(() => user.id, {
        onDelete: "set null",
    }),

    // Track if accepted and moved to members table
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, {
        onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at"),

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
        inviter: one(user, {
            fields: [restaurantInvitations.inviterId],
            references: [user.id],
        }),
        acceptedByUser: one(user, {
            fields: [restaurantInvitations.acceptedByUserId],
            references: [user.id],
        }),
    })
);
