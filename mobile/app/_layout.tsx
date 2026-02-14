import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { authAPI } from '@/lib/api';
import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth-client';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { data, isPending, refetch } = authAPI.useSession();
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
      if (userRole === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(user)');
      }
    } else if (!isAuthenticated && !inAuthGroup && !inPublicGroup) {
      router.replace('/(auth)/sign-in');
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
