import { relations } from "drizzle-orm";
import { pgTable, serial, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurant.schema";
import { menuItems } from "./menu.schema";
import { user } from "./auth.schema";

export const kitchens = pgTable("kitchens", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const kitchenMenuItems = pgTable(
  "kitchen_menu_items",
  {
    id: serial("id").primaryKey(),
    kitchenId: integer("kitchen_id")
      .references(() => kitchens.id, { onDelete: "cascade" })
      .notNull(),
    menuItemId: integer("menu_item_id")
      .references(() => menuItems.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    unqKitchenItem: unique().on(t.kitchenId, t.menuItemId),
  }),
);

export const kitchenMembers = pgTable(
  "kitchen_members",
  {
    id: serial("id").primaryKey(),
    kitchenId: integer("kitchen_id")
      .references(() => kitchens.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    unqKitchenMember: unique().on(t.kitchenId, t.userId),
  }),
);

export const kitchensRelations = relations(kitchens, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [kitchens.restaurantId], references: [restaurants.id] }),
  menuItems: many(kitchenMenuItems),
  members: many(kitchenMembers),
}));
