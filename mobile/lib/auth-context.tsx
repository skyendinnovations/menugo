import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useSession, signOut } from './auth-client';

type AuthContextValue = {
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<unknown> | void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { data, isPending } = useSession();

  const isAuthenticated = !!data?.user;

  const value = useMemo<AuthContextValue>(() => ({
    session: data ?? null,
    isAuthenticated,
    isLoading: !!isPending,
    signOut,
  }), [data, isAuthenticated, isPending]);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isPending) {
      if (isAuthenticated && inAuthGroup) {
        router.replace('/');
      }
      if (!isAuthenticated && !inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [isAuthenticated, isPending, segments, router]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
