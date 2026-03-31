import { pgTable, serial, text, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";

/**
 * Stores FCM push tokens for customers (non-staff app users).
 * Keyed by deviceId since customers are anonymous — no userId.
 */
export const customerDeviceTokens = pgTable(
    "customer_device_tokens",
    {
        id: serial("id").primaryKey(),
        deviceId: text("device_id").notNull(),
        token: text("token").notNull().unique(),
        deviceType: text("device_type").notNull(), // "ios" | "android" | "web"
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (t) => ({
        idxDevice: index("idx_customer_device_tokens_device").on(t.deviceId),
        unqDeviceToken: unique().on(t.deviceId, t.token),
    })
);
