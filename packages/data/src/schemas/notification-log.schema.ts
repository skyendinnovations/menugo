import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { orders } from "./order.schema";

export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    orderId: integer("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    recipientRoleIds: jsonb("recipient_role_ids")
      .$type<number[]>()
      .default([]),
    recipientUserIds: jsonb("recipient_user_ids")
      .$type<string[]>()
      .default([]),
    fcmSuccessCount: integer("fcm_success_count").default(0),
    fcmFailureCount: integer("fcm_failure_count").default(0),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    sentAt: timestamp("sent_at").defaultNow(),
  },
  (t) => ({
    idxRestaurant: index("idx_notification_logs_restaurant").on(
      t.restaurantId,
    ),
    idxOrder: index("idx_notification_logs_order").on(t.orderId),
    idxSentAt: index("idx_notification_logs_sent_at").on(t.sentAt),
  }),
);

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    restaurant: one(restaurants, {
      fields: [notificationLogs.restaurantId],
      references: [restaurants.id],
    }),
    order: one(orders, {
      fields: [notificationLogs.orderId],
      references: [orders.id],
    }),
  }),
);
