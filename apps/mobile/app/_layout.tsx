import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/api/auth';
import { getSession, sessionManager } from '@/lib/auth-client';
import { ROUTES } from '@/lib/routes';
import { getInvitationParams, clearInvitationParams } from '@/lib/utils/invitation-params';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { restaurantAPI, memberAPI } from '@/lib/api';
import { getRoleLandingPage } from '@/lib/utils/role-routing';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { data, isPending, refetch } = useSession();
  const [manualSession, setManualSession] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const isAuthenticated = !!data?.user || !!manualSession?.user;

  // Initialize push notifications when authenticated
  useNotifications(isAuthenticated);

  // Wait for both the hook and the manual session check before redirecting
  const isReady = !isPending && sessionChecked;

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const inPublicGroup = segments[0] === 'order';
    const inInviteRoute = segments[0] === 'invite';

    if (isAuthenticated && !inAdminGroup && !inPublicGroup) {
      // Authenticated user not in admin group (e.g. on root index or auth pages).
      // Re-verify session then redirect based on role.
      getSession().then(async (session) => {
        if (session.data?.user) {
          // Check for stored invitation params before default redirect
          const invitationParams = await getInvitationParams();
          if (invitationParams) {
            await clearInvitationParams();
            router.replace(ROUTES.ADMIN.ACCEPT_INVITATION);
            return;
          }

          // Role-based redirect: if member of exactly one restaurant,
          // jump directly to the role-specific page (e.g. waiter, kitchen).
          try {
            const restaurantsRes = await restaurantAPI.getAll();
            const restaurants = restaurantsRes.data || [];

            if (restaurants.length === 0) {
              // New user with no restaurants → go to onboarding
              router.replace(ROUTES.ADMIN.ONBOARDING as any);
              return;
            }

            if (restaurants.length === 1) {
              const rid = restaurants[0].id;
              const membershipRes = await memberAPI.getMyMembership(rid);
              const landingPage = getRoleLandingPage(membershipRes.data, rid);

              if (landingPage) {
                // Single role → go directly to role page
                router.replace(landingPage as any);
                return;
              }

              // Owner or multi-role → go to restaurant dashboard
              router.replace(ROUTES.ADMIN.RESTAURANTS.detail(rid) as any);
              return;
            }
          } catch (error) {
            // If auth failed, clear session and redirect to sign-in
            if (error instanceof Error && error.message.includes('Authentication failed')) {
              sessionManager.clearSession();
              setManualSession(null);
              router.replace(ROUTES.AUTH.SIGN_IN);
              return;
            }
            console.error('Role-based redirect failed, falling back:', error);
          }

          // Multiple restaurants or error → show restaurant list
          router.replace(ROUTES.ADMIN.HOME);
        } else {
          setManualSession(null);
          refetch();
        }
      });
    } else if (!isAuthenticated && !inAuthGroup && !inPublicGroup && !inInviteRoute) {
      // Re-verify the session before redirecting to sign-in.
      // This prevents a race condition where router.replace from sign-in
      // arrives before useSession has updated with the new auth state.
      getSession().then((session) => {
        if (session.data?.user) {
          setManualSession(session.data);
          refetch();
        } else {
          router.replace(ROUTES.AUTH.SIGN_IN);
        }
      });
    }
  }, [isAuthenticated, isReady, segments]);

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      setManualSession(session.data);
      setSessionChecked(true);
      refetch();
    };

    checkSession();
  }, [refetch]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
