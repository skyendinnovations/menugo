import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";
import { restaurants } from "./restaurant.schema";

export const shiftLogs = pgTable(
  "shift_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    restaurantId: integer("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    clockedInAt: timestamp("clocked_in_at").notNull(),
    clockedOutAt: timestamp("clocked_out_at"),
    durationMinutes: integer("duration_minutes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    idxUserRestaurant: index("idx_shift_logs_user_restaurant").on(
      t.userId,
      t.restaurantId,
    ),
    idxRestaurantDate: index("idx_shift_logs_restaurant_date").on(
      t.restaurantId,
      t.clockedInAt,
    ),
  }),
);

export const shiftLogRelations = relations(shiftLogs, ({ one }) => ({
  user: one(user, {
    fields: [shiftLogs.userId],
    references: [user.id],
  }),
  restaurant: one(restaurants, {
    fields: [shiftLogs.restaurantId],
    references: [restaurants.id],
  }),
}));
