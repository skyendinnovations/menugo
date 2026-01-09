import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authAPI } from '@/lib/api';
import { useEffect, useState } from 'react';
import { getSession } from '@/lib/auth-client';

export default function Layout() {
  const router = useRouter();
  const segments = useSegments();
  const { data, isPending, refetch } = authAPI.useSession();
  const [forceCheck, setForceCheck] = useState(0);
  const [manualSession, setManualSession] = useState<any>(null);

  const isAuthenticated = !!data?.user || !!manualSession?.user;
  const userRole = (data?.user as any)?.role || (manualSession?.user as any)?.role;

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      if (userRole === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(user)');
      }
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    }
  }, [isAuthenticated, isPending, segments, userRole, manualSession]);

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      setManualSession(session.data);
      refetch();
    };

    checkSession();
  }, [segments, refetch]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
