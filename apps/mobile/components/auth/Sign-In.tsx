import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { Stack, Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { authAPI } from '@/lib/api';
import { getSession } from '@/lib/auth-client';
import { Alert } from '@/components/ui/Alert';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { MaterialIcons } from '@expo/vector-icons';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.signIn({ email, password });
      if (result.data?.user) {
        const session = await getSession();
        const role = session.data?.user?.role;
        const target = role === 'admin' ? '/(admin)' : '/(user)';

        router.replace(target);
      } else {
        setError('Sign in failed');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign in');
    } finally {
      setLoading(false);
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
            disabled={loading || !email || !password}
            size="lg"
            className="mt-4"
          />

          <Link href="/(auth)/sign-up" asChild>
            <Button title="Create an account" variant="ghost" size="lg" />
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
