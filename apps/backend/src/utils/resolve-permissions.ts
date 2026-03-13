import { db } from "@menugo/data";
import {
  user as userTable,
  restaurantMembers,
  userRoles,
  roles,
} from "@menugo/data/schemas";
import { eq, and } from "drizzle-orm";
import type { PermissionKey, Permissions } from "@menugo/dto";

/**
 * Resolved permission state for a user in a specific restaurant context.
 *
 * Computed once per request (two DB queries) and cached on
 * `req.resolvedPermissions` so that every subsequent middleware in the
 * same request chain reads from memory instead of the database.
 */
export interface ResolvedPermissions {
  /** Global super-admin flag — bypasses all tenant-level checks. */
  isSuperAdmin: boolean;
  /** True if the user is an active member of this restaurant. */
  isMember: boolean;
  /**
   * True when the user is the restaurant owner via either:
   *  - `restaurant_members.isOwner === true`, or
   *  - a role whose name is literally `"owner"`.
   */
  isOwner: boolean;
  /**
   * Merged set of all permissions granted by every active role
   * assigned to the user in this restaurant.
   * Only `true` values are present — missing keys mean `false`.
   */
  permissions: Permissions;
}

/**
 * Resolves the full permission state for `userId` in `restaurantId` using
 * exactly **two** database queries regardless of how many roles the user has.
 *
 * Query 1 — user row + restaurant_members (LEFT JOIN): obtains
 *   `isSuperAdmin`, `isOwner`, and `isActive` membership status in one round-trip.
 *
 * Query 2 — user_roles + roles (INNER JOIN, active roles only): fetches all
 *   role names and their permission maps so we can merge them.
 *
 * Super-admins short-circuit after Query 1 — Query 2 is never executed.
 *
 * **This function is pure** (no side effects on `req`).
 * The middleware layer is responsible for caching the result on
 * `req.resolvedPermissions`.
 *
 * @param userId       The authenticated user's ID (string, from JWT/session).
 * @param restaurantId The restaurant whose context is being evaluated.
 */
export async function resolvePermissions(
  userId: string,
  restaurantId: number,
): Promise<ResolvedPermissions> {
  // ── Query 1: user + restaurant membership ──────────────────────────────
  // LEFT JOIN means the row is always returned even if the user has no
  // restaurant_members entry, so we never get an empty result for valid users.
  const [userWithMembership] = await db
    .select({
      isSuperAdmin: userTable.isSuperAdmin,
      memberIsOwner: restaurantMembers.isOwner,
      memberIsActive: restaurantMembers.isActive,
    })
    .from(userTable)
    .leftJoin(
      restaurantMembers,
      and(
        eq(restaurantMembers.userId, userTable.id),
        eq(restaurantMembers.restaurantId, restaurantId),
      ),
    )
    .where(eq(userTable.id, userId))
    .limit(1);

  // Guard: should never happen for a properly authenticated user, but
  // returning a fully-denied result is safer than throwing.
  if (!userWithMembership) {
    return { isSuperAdmin: false, isMember: false, isOwner: false, permissions: {} };
  }

  const isSuperAdmin = userWithMembership.isSuperAdmin === true;

  // Super-admins get global access — skip the roles query entirely.
  if (isSuperAdmin) {
    return { isSuperAdmin: true, isMember: true, isOwner: true, permissions: {} };
  }

  // ── Query 2: assigned roles + their permissions ─────────────────────────
  // INNER JOIN with roles so we only fetch valid, active role definitions.
  const roleEntries = await db
    .select({
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(userRoles)
    .innerJoin(
      roles,
      and(eq(userRoles.roleId, roles.id), eq(roles.isActive, true)),
    )
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.restaurantId, restaurantId),
      ),
    );

  // A user is a member when they have an active restaurant_members record
  // OR at least one role assignment in this restaurant.
  const hasMemberRecord = userWithMembership.memberIsActive === true;
  const hasRoleAssignment = roleEntries.length > 0;
  const isMember = hasMemberRecord || hasRoleAssignment;

  // Owner: the explicit flag on restaurant_members takes precedence, but we
  // also honour a role literally named "owner" for backward compatibility.
  const isOwner =
    userWithMembership.memberIsOwner === true ||
    roleEntries.some((r) => r.roleName === "owner");

  // Merge permissions from every assigned role.
  // We only record `true` values — the consumer checks `permissions[key] === true`.
  const permissions: Permissions = {};
  for (const entry of roleEntries) {
    const perms = (entry.permissions ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(perms)) {
      if (value === true) {
        permissions[key as PermissionKey] = true;
      }
    }
  }

  return { isSuperAdmin, isMember, isOwner, permissions };
}
