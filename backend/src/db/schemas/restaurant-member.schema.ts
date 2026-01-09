import { pgTable, serial, text, integer, timestamp, primaryKey, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { user } from "./auth.schema";

export const restaurantMembers = pgTable(
    "restaurant_members",
    {
        id: serial("id").primaryKey(),
        restaurantId: integer("restaurant_id")
            .references(() => restaurants.id, { onDelete: "cascade" })
            .notNull(),
        userId: text("user_id")
            .references(() => user.id, { onDelete: "cascade" })
            .notNull(),

        isOwner: boolean("is_owner").default(false).notNull(),
        isActive: boolean("is_active").default(true).notNull(),

        joinedAt: timestamp("joined_at").defaultNow().notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    }
);

export const restaurantMembersRelations = relations(restaurantMembers, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [restaurantMembers.restaurantId],
        references: [restaurants.id],
    }),
    user: one(user, {
        fields: [restaurantMembers.userId],
        references: [user.id],
    }),
}));
