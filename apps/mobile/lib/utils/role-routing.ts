import { ROUTES } from '@/lib/routes';
import type { MyMembership } from '@menugo/dto';

/**
 * Permissions that indicate an administrative/management user who needs
 * the full dashboard (with navigation to dedicated management pages).
 *
 * Staff with ONLY operational permissions are redirected to the unified
 * staff.tsx dashboard which renders sections based on their permissions.
 */
// Only management-level permissions trigger full dashboard routing.
// Operational permissions (view_orders, close_sessions, order_prepare, etc.)
// always go to the staff page regardless of additional perms like view_reports.
// manage_stock is included because its UI lives in the admin dashboard (stock.tsx).
const ADMIN_PERMISSIONS = [
  'manage_menu',
  'manage_tables',
  'manage_members',
  'manage_roles',
  'manage_restaurant',
  'manage_workflows',
  'manage_stock',
] as const;

/**
 * Determine the landing page for a user based on their PERMISSIONS, not role name.
 *
 * - Owners → full dashboard (null)
 * - Users with any admin permission → full dashboard (null)
 * - All other staff → unified staff.tsx RBAC dashboard
 *
 * This means a role named "Sample" with order_prepare permission will
 * automatically land on the staff dashboard and see the Kitchen section.
 */
export function getRoleLandingPage(
  membership: MyMembership,
  restaurantId: string | number,
): string | null {
  // Owners always see the full dashboard
  if (membership.isOwner) return null;

  const permissions = membership.permissions ?? {};

  // Users with admin-level permissions need the full dashboard
  // so they can navigate to management pages (menu, members, etc.)
  const hasAdminPermission = ADMIN_PERMISSIONS.some((p) => permissions[p] === true);
  if (hasAdminPermission) return null;

  // Pure operational staff → unified RBAC dashboard
  // The staff page renders sections based on permissions, role name is irrelevant.
  return ROUTES.ADMIN.RESTAURANTS.subpage(String(restaurantId), 'staff');
}
