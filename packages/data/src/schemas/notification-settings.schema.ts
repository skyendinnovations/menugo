import { pgTable, serial, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { roles } from "./role.schema";

export const notificationSettings = pgTable(
    "notification_settings",
    {
        id: serial("id").primaryKey(),
        restaurantId: integer("restaurant_id")
            .references(() => restaurants.id, { onDelete: "cascade" })
            .notNull(),

        triggerEvent: text("trigger_event").notNull(),
        roleId: integer("role_id")
            .references(() => roles.id, { onDelete: "cascade" })
            .notNull(),

        enabled: boolean("enabled").default(true),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (t) => ({
        unqSetting: unique().on(t.restaurantId, t.triggerEvent, t.roleId),
    })
);

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [notificationSettings.restaurantId],
        references: [restaurants.id],
    }),
    role: one(roles, {
        fields: [notificationSettings.roleId],
        references: [roles.id],
    }),
}));
