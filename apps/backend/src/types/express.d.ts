declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      subscription?: {
        planSlug: string;
        active: boolean;
        interval: string | null;
        expiresAt: string | null;
      };
      /**
       * Resolved permission state for the current user in the restaurant
       * identified by `req.params.restaurantId`.
       *
       * Populated lazily by `requirePermission`, `requireAnyPermission`, or
       * `requireMembership` on the first check, then reused by every subsequent
       * middleware in the same request chain — so the DB is never hit more
       * than once per request regardless of how many permission guards are used.
       */
      resolvedPermissions?: {
        isSuperAdmin: boolean;
        isMember: boolean;
        isOwner: boolean;
        permissions: import("@menugo/dto").Permissions;
      };
    }
  }
}

export {};
