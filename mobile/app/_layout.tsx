import '../global.css';

import { Stack } from 'expo-router';
import { AuthProvider } from '@/lib/auth-context';

export default function Layout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
