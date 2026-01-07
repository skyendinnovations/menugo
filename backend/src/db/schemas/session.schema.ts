import { pgTable, serial, varchar, text, integer, timestamp, decimal, pgEnum, uniqueIndex, unique, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { restaurantTables } from "./table.schema";
import { user } from "./auth.schema";
import { orders } from "./order.schema";

export const sessionStatusEnum = pgEnum("session_status", [
    "active",
    "closed",
    "cancelled",
]);

export const participantStatusEnum = pgEnum("participant_status", [
    "active",
    "left",
    "removed",
]);

export const tableSessions = pgTable(
    "table_sessions",
    {
        id: serial("id").primaryKey(),
        restaurantId: integer("restaurant_id")
            .references(() => restaurants.id, { onDelete: "cascade" })
            .notNull(),
        tableId: integer("table_id")
            .references(() => restaurantTables.id, { onDelete: "cascade" })
            .notNull(),

        // 4-digit family code for joining existing bill
        joinCode: varchar("join_code", { length: 4 }).notNull(),
        hostDeviceId: text("host_device_id").notNull(),

        // Number of persons in THIS session (for capacity calculation)
        personsCount: integer("persons_count").default(1).notNull(),

        status: sessionStatusEnum("status").default("active"),
        calculatedTotal: decimal("calculated_total", {
            precision: 10,
            scale: 2,
        }).default("0"),

        endedBy: text("ended_by").references(() => user.id, {
            onDelete: "set null",
        }),

        startTime: timestamp("start_time").defaultNow(),
        endTime: timestamp("end_time"),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (t) => ({
        // Ensure unique join codes for active sessions
        unqActiveCode: uniqueIndex("idx_unique_active_join_code")
            .on(t.joinCode)
            .where(sql`${t.status} = 'active'`),

        // Index for querying active sessions by table (for capacity check)
        idxActiveTable: index("idx_active_sessions_by_table")
            .on(t.tableId, t.status),
    })
);

export const sessionParticipants = pgTable(
    "session_participants",
    {
        id: serial("id").primaryKey(),
        sessionId: integer("session_id")
            .references(() => tableSessions.id, { onDelete: "cascade" })
            .notNull(),

        deviceId: text("device_id").notNull(),
        participantName: text("participant_name"),
        status: participantStatusEnum("status").default("active"),
        joinedAt: timestamp("joined_at").defaultNow(),
    },
    (t) => ({
        unqDevice: unique().on(t.sessionId, t.deviceId),
        // Index for device lookup during order validation
        idxDevice: index("idx_participants_device").on(t.deviceId),
    })
);

export const tableSessionsRelations = relations(
    tableSessions,
    ({ one, many }) => ({
        restaurant: one(restaurants, {
            fields: [tableSessions.restaurantId],
            references: [restaurants.id],
        }),
        table: one(restaurantTables, {
            fields: [tableSessions.tableId],
            references: [restaurantTables.id],
        }),
        participants: many(sessionParticipants),
        orders: many(orders),
        ender: one(user, {
            fields: [tableSessions.endedBy],
            references: [user.id],
        }),
    })
);

export const sessionParticipantsRelations = relations(
    sessionParticipants,
    ({ one }) => ({
        session: one(tableSessions, {
            fields: [sessionParticipants.sessionId],
            references: [tableSessions.id],
        }),
    })
);
