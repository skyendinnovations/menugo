/**
 * Canonical permission constants for the MenuGo platform.
 *
 * All permission keys, domain groupings, validation helpers, and default
 * role templates are defined here. This is the single source of truth.
 */

// ─── Permission Keys ────────────────────────────────────────────────

export const PERMISSION_KEYS = [
  // Orders
  "view_orders",
  "update_orders",
  "order_prepare",
  "order_deliver",
  "modify_order",

  // Tables
  "manage_tables",
  "table_force_release",
  "helper_block_table",

  // Menu
  "manage_menu",
  "manage_stock",

  // Staff
  "manage_members",
  "manage_roles",

  // Sessions & Billing
  "close_sessions",

  // System & Administration
  "manage_restaurant",
  "view_reports",
  "view_audit_log",
  "manage_workflows",
  "resend_notification",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type Permissions = Partial<Record<PermissionKey, boolean>>;

// ─── Permission Domain Groupings (for frontend matrix UI) ──────────

export interface PermissionDescriptor {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionDomain {
  domain: string;
  label: string;
  permissions: PermissionDescriptor[];
}

export const PERMISSION_DOMAINS: PermissionDomain[] = [
  {
    domain: "orders",
    label: "Orders",
    permissions: [
      { key: "view_orders", label: "View Orders", description: "View all orders for the restaurant" },
      { key: "update_orders", label: "Update Orders", description: "Update order status" },
      { key: "order_prepare", label: "Prepare Orders", description: "Mark orders as preparing/ready (Kitchen)" },
      { key: "order_deliver", label: "Deliver Orders", description: "Accept and deliver orders (Waiter)" },
      { key: "modify_order", label: "Modify/Void Orders", description: "Edit or void orders after creation" },
    ],
  },
  {
    domain: "tables",
    label: "Tables",
    permissions: [
      { key: "manage_tables", label: "Manage Tables", description: "Create, update, and delete tables" },
      { key: "table_force_release", label: "Force Release Table", description: "Force release a locked table" },
      { key: "helper_block_table", label: "Block/Unblock Table", description: "Soft-block tables for crowd control" },
    ],
  },
  {
    domain: "menu",
    label: "Menu",
    permissions: [
      { key: "manage_menu", label: "Manage Menu", description: "Create, update, and delete menu items and categories" },
      { key: "manage_stock", label: "Manage Stock", description: "Toggle sold-out status and manage inventory counts" },
    ],
  },
  {
    domain: "staff",
    label: "Staff",
    permissions: [
      { key: "manage_members", label: "Manage Members", description: "Invite, remove, and manage staff members" },
      { key: "manage_roles", label: "Manage Roles", description: "Create, update, and assign roles and permissions" },
    ],
  },
  {
    domain: "billing",
    label: "Sessions & Billing",
    permissions: [
      { key: "close_sessions", label: "Close Sessions", description: "Close table sessions and finalize bills" },
    ],
  },
  {
    domain: "system",
    label: "System",
    permissions: [
      { key: "manage_restaurant", label: "Manage Restaurant", description: "Update restaurant settings and configuration" },
      { key: "view_reports", label: "View Reports", description: "Access analytics and reports" },
      { key: "view_audit_log", label: "View Audit Log", description: "View the system audit log" },
      { key: "manage_workflows", label: "Manage Workflows", description: "Configure order workflow transitions" },
      { key: "resend_notification", label: "Resend Notifications", description: "Manually resend push notifications" },
    ],
  },
];

// ─── Validation Helpers ─────────────────────────────────────────────

export const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(PERMISSION_KEYS);

export function isValidPermissionKey(key: string): key is PermissionKey {
  return PERMISSION_KEY_SET.has(key);
}

/**
 * Strips invalid keys and non-boolean values from a permissions object.
 */
export function sanitizePermissions(input: Record<string, unknown>): Permissions {
  const result: Permissions = {};
  for (const [key, value] of Object.entries(input)) {
    if (isValidPermissionKey(key) && typeof value === "boolean") {
      result[key] = value;
    }
  }
  return result;
}

// ─── Default Role Templates ─────────────────────────────────────────

export interface RoleTemplate {
  name: string;
  permissions: Permissions;
}

/**
 * Default role templates seeded when a restaurant is created.
 * Owner role has all permissions but relies on hardcoded bypass in middleware.
 */
export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: "owner",
    permissions: Object.fromEntries(
      PERMISSION_KEYS.map((key) => [key, true]),
    ) as Record<PermissionKey, boolean>,
  },
  {
    name: "manager",
    permissions: {
      view_orders: true,
      update_orders: true,
      order_prepare: true,
      order_deliver: true,
      modify_order: true,
      manage_tables: true,
      table_force_release: true,
      manage_menu: true,
      manage_stock: true,
      manage_members: true,
      close_sessions: true,
      manage_restaurant: true,
      view_reports: true,
      view_audit_log: true,
      manage_workflows: true,
      resend_notification: true,
      // manage_roles intentionally omitted — configurable per restaurant
    },
  },
  {
    name: "kitchen",
    permissions: {
      view_orders: true,
      update_orders: true,
      order_prepare: true,
    },
  },
  {
    name: "waiter",
    permissions: {
      view_orders: true,
      update_orders: true,
      order_deliver: true,
    },
  },
  {
    name: "cashier",
    permissions: {
      view_orders: true,
      close_sessions: true,
      view_reports: true,
    },
  },
  {
    name: "helper",
    permissions: {
      manage_tables: true,
      helper_block_table: true,
    },
  },
];
