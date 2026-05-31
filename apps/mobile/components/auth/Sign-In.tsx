import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  TextInput,
} from 'react-native';
import React, { useRef, useState } from 'react';

import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { authAPI } from '@/lib/api';
import { Alert } from '@/components/ui/Alert';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { useSession } from '@/lib/auth-client';
import { ROUTES } from '@/lib/routes';

export function SignInForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; redirect?: string }>();
  const { refetch } = useSession();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit() {
    if (!email) {
      setError('Email is required');
      emailInputRef.current?.focus();
      return;
    }
    if (!password) {
      setError('Password is required');
      passwordInputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.signIn({ email, password });
      if (result.data?.user) {
        await refetch();
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

      if (!result?.data) {
        return; // User cancelled
      }

      await refetch();
      if ('user' in result.data && result.data.user) {
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
      className="flex-1 bg-white">
      <Stack.Screen options={{ title: 'Sign In', headerShown: false }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        <View className="mb-10 items-center">
          <View className="flex-row items-center gap-3 mb-5">
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-brand">
              <MaterialIcons name="restaurant-menu" size={28} color="white" />
            </View>
            <Text className="text-3xl font-bold text-black">MenuGo</Text>
          </View>
          <Text className="text-3xl font-bold text-black">Welcome back</Text>
          <Text className="mt-2 text-base text-gray-600">
            Sign in to manage your restaurants
          </Text>
        </View>

        {error ? <Alert variant="destructive" description={error} className="mb-6" /> : null}

        <View className="gap-4">
          <View>
            <Label>Email</Label>
            <Input
              ref={emailInputRef}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
          </View>
          <View>
            <View className="flex-row items-baseline justify-between">
              <Label>Password</Label>
              <Link href={ROUTES.AUTH.FORGOT_PASSWORD} asChild>
                <Text className="text-sm font-medium text-brand">Forgot?</Text>
              </Link>
            </View>
            <PasswordInput
              ref={passwordInputRef}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          </View>

          <Button
            title="Sign In"
            onPress={onSubmit}
            loading={loading}
            disabled={loading || googleLoading}
            size="lg"
          />
          <Button
            title="Sign in with Google"
            onPress={onGoogleSignIn}
            loading={googleLoading}
            disabled={loading || googleLoading}
            variant="outline"
            size="lg"
            icon={
              googleLoading ? undefined : <AntDesign name="google" size={20} color="#1F2937" />
            }
          />

          <Text className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href={ROUTES.AUTH.SIGN_UP} asChild>
              <Text className="font-bold text-brand">Sign Up</Text>
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

