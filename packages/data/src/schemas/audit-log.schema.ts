import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { restaurants } from "./restaurant.schema";
import { user } from "./auth.schema";

export const auditActionEnum = pgEnum("audit_action", [
  "role_created",
  "role_updated",
  "role_deleted",
  "permission_changed",
  "member_invited",
  "member_removed",
  "order_status_changed",
  "order_voided",
  "order_claimed",
  "notification_resent",
  "session_closed",
  "session_force_closed",
  "table_blocked",
  "table_unblocked",
  "table_force_released",
  "menu_availability_changed",
  "stock_updated",
  "workflow_changed",
  "override",
]);

export const auditEntityEnum = pgEnum("audit_entity", [
  "role",
  "member",
  "invitation",
  "order",
  "session",
  "table",
  "menu_item",
  "menu_variant",
  "restaurant",
  "workflow",
]);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),

    restaurantId: integer("restaurant_id")
      .references(() => restaurants.id, { onDelete: "cascade" })
      .notNull(),

    actorUserId: text("actor_user_id")
      .references(() => user.id, { onDelete: "set null" }),

    action: auditActionEnum("action").notNull(),
    entityType: auditEntityEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),

    /** Snapshot of the entity state before the change (null for create). */
    oldValue: jsonb("old_value"),

    /** Snapshot of the entity state after the change (null for delete). */
    newValue: jsonb("new_value"),

    /** Mandatory for force/override actions. */
    reason: text("reason"),

    ipAddress: text("ip_address"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    idxRestaurant: index("idx_audit_logs_restaurant").on(t.restaurantId),
    idxActor: index("idx_audit_logs_actor").on(t.actorUserId),
    idxAction: index("idx_audit_logs_action").on(t.restaurantId, t.action),
    idxEntity: index("idx_audit_logs_entity").on(
      t.restaurantId,
      t.entityType,
      t.entityId,
    ),
    idxCreatedAt: index("idx_audit_logs_created_at").on(
      t.restaurantId,
      t.createdAt,
    ),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [auditLogs.restaurantId],
    references: [restaurants.id],
  }),
  actor: one(user, {
    fields: [auditLogs.actorUserId],
    references: [user.id],
  }),
}));
