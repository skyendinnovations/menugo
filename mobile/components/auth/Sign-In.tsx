import { View, Text } from 'react-native';
import { useState } from 'react';
import { Stack, Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Container } from '@/components/ui/Container';
import { getSession } from '@/lib/auth-client';
import React from 'react';
import { authAPI } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { PasswordInput } from '@/components/ui/PasswordInput';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.signIn({ email, password });

      if (result.data?.user) {
        const session = await getSession();
        if (session.data?.user.role === 'admin') {
          router.replace('/(admin)');
        } else {
          router.replace('/(user)');
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
  return (
    <View className="flex flex-1 bg-black">
      <Stack.Screen options={{ title: 'Sign In', headerShown: false }} />
      <Container>
        <Text className="mb-20 mt-20 text-2xl font-semibold text-white">Welcome back!</Text>

        {error ? (
          <Alert variant="destructive" title="Error" description={error} className="mb-10" />
        ) : null}
        <Card className="border-2 px-3 pb-20 pt-10">
          <View className="gap-3">
            <View>
              <Label nativeID="email" required>
                Email Address
              </Label>
              <Input
                id="email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
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
                placeholder="••••••••"
              />
            </View>
            <Button
              title={loading ? 'Signing in…' : 'Sign In'}
              onPress={onSubmit}
              disabled={loading || !email || !password}
              className="mt-8 bg-red-600 py-2 "
            />
            <Link href="/(auth)/sign-up" asChild>
              <Button
                title="Create an account"
                className="rounded bg-red-600 px-10 py-2  text-sm"
              />
            </Link>
          </View>
        </Card>
      </Container>
    </View>
  );
}
