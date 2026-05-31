import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/api/auth';
import { getSession } from '@/lib/auth-client';
import { ROUTES } from '@/lib/routes';
import { getInvitationParams, clearInvitationParams } from '@/lib/utils/invitation-params';
import { useNotifications } from '@/lib/hooks/useNotifications';

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
      // Re-verify session then redirect to admin home.
      getSession()
        .then(async (session) => {
          if (session.data?.user) {
            // Check for stored invitation params before default redirect
            const invitationParams = await getInvitationParams();
            if (invitationParams) {
              await clearInvitationParams();
              router.replace(ROUTES.ADMIN.ACCEPT_INVITATION);
              return;
            }

            router.replace(ROUTES.ADMIN.HOME);
          } else {
            setManualSession(null);
            refetch();
          }
        })
        .catch(() => {
          setManualSession(null);
          router.replace(ROUTES.AUTH.SIGN_IN);
        });
    } else if (!isAuthenticated && !inAuthGroup && !inPublicGroup && !inInviteRoute) {
      // Re-verify the session before redirecting to sign-in.
      // This prevents a race condition where router.replace from sign-in
      // arrives before useSession has updated with the new auth state.
      getSession()
        .then((session) => {
          if (session.data?.user) {
            setManualSession(session.data);
            refetch();
          } else {
            router.replace(ROUTES.AUTH.SIGN_IN);
          }
        })
        .catch(() => {
          router.replace(ROUTES.AUTH.SIGN_IN);
        });
    }
  }, [isAuthenticated, isReady, segments]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        setManualSession(session.data);
        refetch();
      } catch {
        setManualSession(null);
      } finally {
        setSessionChecked(true);
      }
    };

    checkSession();
  }, [refetch]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}
