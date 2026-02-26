import { pgTable, serial, integer, text, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { orderStatusEnum } from "./order.schema";

export const restaurantWorkflows = pgTable(
    "restaurant_workflows",
    {
        id: serial("id").primaryKey(),
        restaurantId: integer("restaurant_id")
            .references(() => restaurants.id, { onDelete: "cascade" })
            .notNull(),
        fromState: orderStatusEnum("from_state").notNull(),
        toState: orderStatusEnum("to_state").notNull(),
        requiredPermission: text("required_permission"),
        displayOrder: integer("display_order").default(0).notNull(),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (t) => ({
        unqTransition: unique().on(t.restaurantId, t.fromState, t.toState),
        idxRestaurant: index("idx_workflows_restaurant").on(t.restaurantId),
    })
);

export const restaurantWorkflowsRelations = relations(restaurantWorkflows, ({ one }) => ({
    restaurant: one(restaurants, {
        fields: [restaurantWorkflows.restaurantId],
        references: [restaurants.id],
    }),
}));
