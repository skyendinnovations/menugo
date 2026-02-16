import { pgTable, serial, text, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { orderItems } from "./order.schema";

export const menuCategories = pgTable("menu_categories", {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
        .references(() => restaurants.id, { onDelete: "cascade" })
        .notNull(),

    name: text("name").notNull(),
    displayOrder: integer("display_order").default(0),
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const menuItems = pgTable("menu_items", {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
        .references(() => restaurants.id, { onDelete: "cascade" })
        .notNull(),
    categoryId: integer("category_id")
        .references(() => menuCategories.id, { onDelete: "cascade" })
        .notNull(),

    name: text("name").notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),

    isVeg: boolean("is_veg").default(false),
    imagePath: text("image_path"),
    isAvailable: boolean("is_available").default(true),
    isActive: boolean("is_active").default(true),

    hasVariants: boolean("has_variants").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const menuItemVariants = pgTable("menu_item_variants", {
    id: serial("id").primaryKey(),
    menuItemId: integer("menu_item_id")
        .references(() => menuItems.id, { onDelete: "cascade" })
        .notNull(),

    name: text("name").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
});

export const menuCategoriesRelations = relations(
    menuCategories,
    ({ one, many }) => ({
        restaurant: one(restaurants, {
            fields: [menuCategories.restaurantId],
            references: [restaurants.id],
        }),
        items: many(menuItems),
    })
);

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
    restaurant: one(restaurants, {
        fields: [menuItems.restaurantId],
        references: [restaurants.id],
    }),
    category: one(menuCategories, {
        fields: [menuItems.categoryId],
        references: [menuCategories.id],
    }),
    variants: many(menuItemVariants),
    orderItems: many(orderItems),
}));

export const menuItemVariantsRelations = relations(
    menuItemVariants,
    ({ one }) => ({
        menuItem: one(menuItems, {
            fields: [menuItemVariants.menuItemId],
            references: [menuItems.id],
        }),
    })
);
