import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  pgEnum,
  uniqueIndex,
  varchar,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ==================================================================================
   1. GLOBAL ENUMS
================================================================================== */

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

export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "closed",
  "cancelled",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
]);

export const participantStatusEnum = pgEnum("participant_status", [
  "active",
  "left",
  "removed",
]);

/* ==================================================================================
   2. TENANT & CONFIGURATION
================================================================================== */

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  workflowSettings: jsonb("workflow_settings").notNull().default({
    hasKitchenView: true,
    orderFlow: ["received", "preparing", "ready", "served", "paid"],
  }),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/* ==================================================================================
   3. STAFF, ROLES & INVITATIONS
================================================================================== */

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id, { onDelete: "cascade" })
    .notNull(),

  name: text("name").notNull(),
  permissions: jsonb("permissions").notNull().default({}),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id, {
    onDelete: "cascade",
  }),
  roleId: integer("role_id").references(() => roles.id, {
    onDelete: "set null",
  }),

  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),

  isSuperAdmin: boolean("is_super_admin").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const restaurantInvitations = pgTable("restaurant_invitations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .references(() => restaurants.id, { onDelete: "cascade" })
    .notNull(),
  roleId: integer("role_id")
    .references(() => roles.id, { onDelete: "cascade" })
    .notNull(),

  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  inviterId: integer("inviter_id").references(() => users.id, {
    onDelete: "set null",
  }),

  status: invitationStatusEnum("status").default("pending"),
  
  // Email tracking fields
  sentAt: timestamp("sent_at"),
  resentCount: integer("resent_count").default(0),
  lastResentAt: timestamp("last_resent_at"),
  
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ==================================================================================
   4. PHYSICAL ASSETS
================================================================================== */

export const restaurantTables = pgTable(
  "restaurant_tables",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),

    tableNumber: integer("table_number").notNull(),
    qrCode: text("qr_code").unique(),
    capacity: integer("capacity").default(4).notNull(),

    // Removed status field - calculate dynamically from active sessions
    isActive: boolean("is_active").default(true),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    unqTable: unique().on(t.restaurantId, t.tableNumber),
  })
);

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

/* ==================================================================================
   5. ORDERING ENGINE
================================================================================== */

export const tableSessions = pgTable(
  "table_sessions",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),
    tableId: integer("table_id")
      .references(() => restaurantTables.id, { onDelete: "cascade" })
      .notNull(),

    // 4-digit family code for joining existing bill
    joinCode: varchar("join_code", { length: 4 }).notNull(),
    hostDeviceId: text("host_device_id").notNull(),
    
    // Number of persons in THIS session (for capacity calculation)
    personsCount: integer("persons_count").default(1).notNull(),

    status: sessionStatusEnum("status").default("active"),
    calculatedTotal: decimal("calculated_total", {
      precision: 10,
      scale: 2,
    }).default("0"),

    endedBy: integer("ended_by").references(() => users.id, {
      onDelete: "set null",
    }),

    startTime: timestamp("start_time").defaultNow(),
    endTime: timestamp("end_time"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    // Ensure unique join codes for active sessions
    unqActiveCode: uniqueIndex("idx_unique_active_join_code")
      .on(t.joinCode)
      .where(sql`${t.status} = 'active'`),
    
    // Index for querying active sessions by table (for capacity check)
    idxActiveTable: index("idx_active_sessions_by_table")
      .on(t.tableId, t.status),
  })
);

export const sessionParticipants = pgTable(
  "session_participants",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .references(() => tableSessions.id, { onDelete: "cascade" })
      .notNull(),

    deviceId: text("device_id").notNull(),
    participantName: text("participant_name"),
    status: participantStatusEnum("status").default("active"),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (t) => ({
    unqDevice: unique().on(t.sessionId, t.deviceId),
    // Index for device lookup during order validation
    idxDevice: index("idx_participants_device").on(t.deviceId),
  })
);

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
    createdBy: integer("created_by").references(() => users.id, {
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

/* ==================================================================================
   6. RELATIONS
================================================================================== */

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  users: many(users),
  roles: many(roles),
  tables: many(restaurantTables),
  menuCategories: many(menuCategories),
  sessions: many(tableSessions),
}));

export const usersRelations = relations(users, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [users.restaurantId],
    references: [restaurants.id],
  }),
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
}));

export const restaurantTablesRelations = relations(
  restaurantTables,
  ({ one, many }) => ({
    restaurant: one(restaurants, {
      fields: [restaurantTables.restaurantId],
      references: [restaurants.id],
    }),
    sessions: many(tableSessions),
  })
);

export const tableSessionsRelations = relations(
  tableSessions,
  ({ one, many }) => ({
    restaurant: one(restaurants, {
      fields: [tableSessions.restaurantId],
      references: [restaurants.id],
    }),
    table: one(restaurantTables, {
      fields: [tableSessions.tableId],
      references: [restaurantTables.id],
    }),
    participants: many(sessionParticipants),
    orders: many(orders),
  })
);

export const sessionParticipantsRelations = relations(
  sessionParticipants,
  ({ one }) => ({
    session: one(tableSessions, {
      fields: [sessionParticipants.sessionId],
      references: [tableSessions.id],
    }),
  })
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(tableSessions, {
    fields: [orders.tableSessionId],
    references: [tableSessions.id],
  }),
  items: many(orderItems),
  creator: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
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

export const rolesRelations = relations(roles, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [roles.restaurantId],
    references: [restaurants.id],
  }),
  users: many(users),
}));

export const restaurantInvitationsRelations = relations(
  restaurantInvitations,
  ({ one }) => ({
    restaurant: one(restaurants, {
      fields: [restaurantInvitations.restaurantId],
      references: [restaurants.id],
    }),
    role: one(roles, {
      fields: [restaurantInvitations.roleId],
      references: [roles.id],
    }),
    inviter: one(users, {
      fields: [restaurantInvitations.inviterId],
      references: [users.id],
    }),
  })
);