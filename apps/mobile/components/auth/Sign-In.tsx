import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { Stack, Link, useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { authAPI } from '@/lib/api';
import { Alert } from '@/components/ui/Alert';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';
import { useSession } from '@/lib/api/auth';

export function SignInForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; redirect?: string }>();
  const { refetch } = useSession();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.signIn({ email, password });
      if (result.data?.user) {
        if (params.redirect === 'invitations') {
          router.replace(ROUTES.ADMIN.ACCEPT_INVITATION);
        } else {
          router.replace(ROUTES.ADMIN.HOME);
        }
      } else {
        setError('Sign in failed');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await authAPI.signInWithGoogle();
      // After the OAuth flow completes, refetch session and navigate
      await refetch();
      if (result?.data && 'user' in result.data && result.data.user) {
        if (params.redirect === 'invitations') {
          router.replace(ROUTES.ADMIN.ACCEPT_INVITATION);
        } else {
          router.replace(ROUTES.ADMIN.HOME);
        }
      }
      // If no user data (web redirect), the _layout will handle navigation
      // after session is detected via the auth redirect callback
    } catch (e: any) {
      setError(e?.message ?? 'Google sign in failed');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900">
      <Stack.Screen options={{ title: 'Sign In', headerShown: false }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        <View className="mb-10 items-center">
          <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-brand/15">
            <MaterialIcons name="restaurant-menu" size={40} color="#F97316" />
          </View>
          <Text className="text-3xl font-bold text-white">Welcome back</Text>
          <Text className="mt-2 text-base text-slate-400">Sign in to your account</Text>
        </View>

        {error ? <Alert variant="destructive" description={error} className="mb-6" /> : null}

        <View className="gap-5">
          <View>
            <Label nativeID="email" required>
              Email
            </Label>
            <Input
              id="email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View>
            <Label nativeID="password" required>
              Password
            </Label>
            <PasswordInput
              id="password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
            />
          </View>

          <Button
            title="Sign In"
            loading={loading}
            onPress={onSubmit}
            disabled={loading || googleLoading || !email || !password}
            size="lg"
            className="mt-4"
          />

          <View className="my-2 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-slate-700" />
            <Text className="text-sm text-slate-500">or</Text>
            <View className="h-px flex-1 bg-slate-700" />
          </View>

          <Button
            title="Continue with Google"
            variant="ghost"
            loading={googleLoading}
            onPress={onGoogleSignIn}
            disabled={loading || googleLoading}
            size="lg"
            icon={!googleLoading ? <AntDesign name="google" size={20} color="#fff" /> : undefined}
          />

          <Link href={ROUTES.AUTH.SIGN_UP} asChild>
            <Button title="Create an account" variant="ghost" size="lg" />
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
