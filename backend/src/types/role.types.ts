export const PERMISSION_KEYS = [
  "manage_menu",
  "manage_tables",
  "manage_members",
  "manage_roles",
  "view_orders",
  "update_orders",
  "close_sessions",
  "view_reports",
  "manage_restaurant",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type Permissions = Partial<Record<PermissionKey, boolean>>;

export interface RoleTemplate {
  name: string;
  permissions: Permissions;
}

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: "owner",
    permissions: {
      manage_menu: true,
      manage_tables: true,
      manage_members: true,
      manage_roles: true,
      view_orders: true,
      update_orders: true,
      close_sessions: true,
      view_reports: true,
      manage_restaurant: true,
    },
  },
  {
    name: "manager",
    permissions: {
      manage_menu: true,
      manage_tables: true,
      manage_members: true,
      view_orders: true,
      update_orders: true,
      close_sessions: true,
      view_reports: true,
    },
  },
  {
    name: "kitchen",
    permissions: {
      view_orders: true,
      update_orders: true,
    },
  },
  {
    name: "waiter",
    permissions: {
      view_orders: true,
      update_orders: true,
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
];

export interface CreateRoleDTO {
  name: string;
  permissions: Permissions;
}

export interface UpdateRoleDTO {
  name?: string;
  permissions?: Permissions;
  isActive?: boolean;
}
