import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export const entityTypeEnum = pgEnum("entity_type", [
    "restaurant",
    "menu_item",
    "user",
]);

export const files = pgTable("files", {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    url: text("url").notNull(),
    originalName: text("original_name"),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    purpose: text("purpose").default("image"),
    createdAt: timestamp("created_at").defaultNow(),
});
