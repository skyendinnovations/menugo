// ─── Audit Action Types ─────────────────────────────────────────────

export const AUDIT_ACTIONS = [
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
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ─── Audit Entity Types ─────────────────────────────────────────────

export const AUDIT_ENTITIES = [
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
] as const;

export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

// ─── Audit Log Entry ────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number;
  restaurantId: number;
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

// ─── Audit Query Filters ────────────────────────────────────────────

export interface AuditLogFilters {
  action?: AuditAction;
  entityType?: AuditEntity;
  entityId?: string;
  actorUserId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
