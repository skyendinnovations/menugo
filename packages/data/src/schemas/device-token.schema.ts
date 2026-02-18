import { pgTable, serial, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";

export const deviceTokens = pgTable(
    "device_tokens",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .references(() => user.id, { onDelete: "cascade" })
            .notNull(),

        token: text("token").notNull().unique(),
        deviceType: text("device_type").notNull(), // "ios" | "android"
        deviceName: text("device_name"),

        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (t) => ({
        idxUser: index("idx_device_tokens_user").on(t.userId),
    })
);

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
    user: one(user, {
        fields: [deviceTokens.userId],
        references: [user.id],
    }),
}));
