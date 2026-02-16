import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/api/auth';
import { getSession } from '@/lib/auth-client';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { data, isPending, refetch } = useSession();
  const [manualSession, setManualSession] = useState<any>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const isAuthenticated = !!data?.user || !!manualSession?.user;
  const userRole = (data?.user as any)?.role || (manualSession?.user as any)?.role;

  // Wait for both the hook and the manual session check before redirecting
  const isReady = !isPending && sessionChecked;

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPublicGroup = segments[0] === 'order';

    if (isAuthenticated && inAuthGroup) {
      // Re-verify session before redirecting away from auth group.
      // This prevents a race condition where sign-out navigates to sign-in
      // but useSession still has stale authenticated data.
      getSession().then((session) => {
        if (session.data?.user) {
          const role = (session.data.user as any)?.role;
          if (role === 'admin') {
            router.replace('/(admin)');
          } else {
            router.replace('/(user)');
          }
        } else {
          setManualSession(null);
          refetch();
        }
      });
    } else if (!isAuthenticated && !inAuthGroup && !inPublicGroup) {
      // Re-verify the session before redirecting to sign-in.
      // This prevents a race condition where router.replace from sign-in
      // arrives before useSession has updated with the new auth state.
      getSession().then((session) => {
        if (session.data?.user) {
          setManualSession(session.data);
          refetch();
        } else {
          router.replace('/(auth)/sign-in');
        }
      });
    }
  }, [isAuthenticated, isReady, segments, userRole]);

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
