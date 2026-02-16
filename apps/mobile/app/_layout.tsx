import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/api/auth';
import { getSession } from '@/lib/auth-client';
import { ROUTES } from '@/lib/routes';
import { getInvitationParams, clearInvitationParams } from '@/lib/utils/invitation-params';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { data, isPending, refetch } = useSession();
  const [manualSession, setManualSession] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const isAuthenticated = !!data?.user || !!manualSession?.user;

  // Wait for both the hook and the manual session check before redirecting
  const isReady = !isPending && sessionChecked;

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPublicGroup = segments[0] === 'order';
    const inInviteRoute = segments[0] === 'invite';

    if (isAuthenticated && inAuthGroup) {
      // Re-verify session before redirecting away from auth group.
      // This prevents a race condition where sign-out navigates to sign-in
      // but useSession still has stale authenticated data.
      getSession().then(async (session) => {
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
