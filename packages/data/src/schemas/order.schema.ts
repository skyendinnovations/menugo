import { pgTable, serial, text, integer, timestamp, decimal, pgEnum, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { tableSessions } from "./session.schema";
import { user } from "./auth.schema";
import { menuItems } from "./menu.schema";

export const orderStatusEnum = pgEnum("order_status", [
    "received",
    "preparing",
    "ready",
    "served",
    "paid",
    "cancelled",
]);

export const itemStatusEnum = pgEnum("item_status", [
    "received",
    "preparing",
    "ready",
    "served",
    "cancelled",
]);

export const orders = pgTable(
    "orders",
    {
        id: serial("id").primaryKey(),
        restaurantId: integer("restaurant_id")
            .references(() => restaurants.id, { onDelete: "cascade" })
            .notNull(),
        tableSessionId: integer("table_session_id")
            .references(() => tableSessions.id, { onDelete: "cascade" })
            .notNull(),

        // Staff-created orders (waiter taking order)
        createdBy: text("created_by").references(() => user.id, {
            onDelete: "set null",
        }),

        // Customer-created orders (self-service via app)
        // CRITICAL: Used for device security validation
        createdByDeviceId: text("created_by_device_id"),

        orderNumber: text("order_number").notNull(),
        status: orderStatusEnum("status").default("received"),

        notes: text("notes"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (t) => ({
        unqOrderNum: unique().on(t.restaurantId, t.orderNumber),
        idxKitchen: index("idx_orders_kitchen").on(t.restaurantId, t.status),
        // Index for device-based order validation (security check)
        idxDevice: index("idx_orders_device").on(t.createdByDeviceId),
        // Index for session-based queries
        idxSession: index("idx_orders_session").on(t.tableSessionId),
    })
);

export const orderItems = pgTable("order_items", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
        .references(() => orders.id, { onDelete: "cascade" })
        .notNull(),
    menuItemId: integer("menu_item_id")
        .references(() => menuItems.id)
        .notNull(),

    itemName: text("item_name").notNull(),
    variantName: text("variant_name"),
    priceAtOrder: decimal("price_at_order", {
        precision: 10,
        scale: 2,
    }).notNull(),

    quantity: integer("quantity").default(1),
    notes: text("notes"),
    status: itemStatusEnum("status").default("received"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [orders.restaurantId],
        references: [restaurants.id],
    }),
    session: one(tableSessions, {
        fields: [orders.tableSessionId],
        references: [tableSessions.id],
    }),
    items: many(orderItems),
    creator: one(user, {
        fields: [orders.createdBy],
        references: [user.id],
    }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    menuItem: one(menuItems, {
        fields: [orderItems.menuItemId],
        references: [menuItems.id],
    }),
}));
