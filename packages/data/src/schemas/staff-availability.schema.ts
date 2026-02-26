import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";
import { restaurants } from "./restaurant.schema";

export const staffAvailabilityStatusEnum = pgEnum(
  "staff_availability_status",
  ["clocked_in", "clocked_out"],
);

export const staffAvailability = pgTable(
  "staff_availability",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    restaurantId: integer("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    status: staffAvailabilityStatusEnum("status")
      .default("clocked_out")
      .notNull(),
    activeOrderCount: integer("active_order_count").default(0).notNull(),
    clockedInAt: timestamp("clocked_in_at"),
    clockedOutAt: timestamp("clocked_out_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    unqUserRestaurant: unique().on(t.userId, t.restaurantId),
    idxRestaurant: index("idx_staff_availability_restaurant").on(
      t.restaurantId,
    ),
    idxStatus: index("idx_staff_availability_status").on(
      t.restaurantId,
      t.status,
    ),
  }),
);

export const staffAvailabilityRelations = relations(
  staffAvailability,
  ({ one }) => ({
    user: one(user, {
      fields: [staffAvailability.userId],
      references: [user.id],
    }),
    restaurant: one(restaurants, {
      fields: [staffAvailability.restaurantId],
      references: [restaurants.id],
    }),
  }),
);
