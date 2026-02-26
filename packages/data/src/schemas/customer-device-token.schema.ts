import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

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
    idxDeviceId: index("idx_customer_device_tokens_device").on(t.deviceId),
  }),
);
