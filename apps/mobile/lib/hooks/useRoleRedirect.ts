/**
 * useRoleRedirect — Auto-navigates to the most relevant page for the user's role.
 * Priority: kitchen → kitchen page, waiter → waiter page, cashier → cashier page,
 * owner/manager/other → restaurant dashboard.
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { memberAPI } from '@/lib/api';
import { ROUTES } from '@/lib/routes';

interface UseRoleRedirectOptions {
  restaurantId: number;
  enabled?: boolean; // only redirect if true (e.g., first mount)
}

const ROLE_TO_ROUTE: Record<string, string> = {
  kitchen: 'kitchen',
  waiter: 'waiter',
  cashier: 'cashier',
  server: 'waiter', // alias
};

export function useRoleRedirect({ restaurantId, enabled = true }: UseRoleRedirectOptions) {
  const router = useRouter();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!enabled || didRedirect.current) return;

    (async () => {
      try {
        const res = await memberAPI.getMyMembership(restaurantId);
        const membership = res.data;

        // Owners and managers go to the dashboard (no forced redirect)
        if (membership.isOwner) return;

        const roles: string[] =
          membership.roles?.map((r: any) => (r.name || r.roleName || '').toLowerCase()) ?? [];

        // Find the first matching role route
        for (const role of roles) {
          const targetRoute = ROLE_TO_ROUTE[role];
          if (targetRoute) {
            // Check if user has permission for that route
            if (membership.permissions?.view_orders || membership.permissions?.close_sessions) {
              didRedirect.current = true;
              router.replace(ROUTES.ADMIN.RESTAURANTS.subpage(restaurantId, targetRoute) as any);
              return;
            }
          }
        }
      } catch (err) {
        // Non-fatal — fall back to dashboard
        console.warn('Failed to determine role for redirect:', err);
      }
    })();
  }, [restaurantId, enabled, router]);
}
