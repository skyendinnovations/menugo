import { pgTable, serial, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { tableSessions } from "./session.schema";

export const restaurantTables = pgTable(
    "restaurant_tables",
    {
        id: serial("id").primaryKey(),
        restaurantId: integer("restaurant_id")
            .references(() => restaurants.id, { onDelete: "cascade" })
            .notNull(),

        tableNumber: integer("table_number").notNull(),
        qrCode: text("qr_code").unique(),
        capacity: integer("capacity").default(4).notNull(),

        // Removed status field - calculate dynamically from active sessions
        isActive: boolean("is_active").default(true),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (t) => ({
        unqTable: unique().on(t.restaurantId, t.tableNumber),
    })
);

export const restaurantTablesRelations = relations(
    restaurantTables,
    ({ one, many }) => ({
        restaurant: one(restaurants, {
            fields: [restaurantTables.restaurantId],
            references: [restaurants.id],
        }),
        sessions: many(tableSessions),
    })
);
