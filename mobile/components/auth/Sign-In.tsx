import { View, Text } from 'react-native'
import { useState } from 'react';
import { Stack, Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Container } from '@/components/ui/Container';
import { getSession, signIn } from '@/lib/auth-client';
import React from 'react'
import { authAPI } from '@/lib/api';

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
      console.log('Sign-in successful', result);

      if (result.data?.user) {
        const session = await getSession();
        if(session.data?.user.role === 'admin') {
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
        <Text className="text-2xl font-semibold mb-20 text-white mt-20">Welcome back!</Text>
        {error ? <Text className="text-red-600 mb-2">{error}</Text> : null}
        <View className="gap-3">
          <View>
            <Label nativeID="email" required>Email Address</Label>
            <Input id="email" value={email} onChangeText={setEmail} placeholder="Enter your email" autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View>
            <Label nativeID="password" required>Password</Label>
            <Input id="password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          </View>
          <Button title={loading ? 'Signing in…' : 'Sign In'} onPress={onSubmit} disabled={loading || !email || !password} className='bg-red-600 py-2 mt-8 '/>
          <Link href="/(auth)/sign-up" asChild>
            <Button title="Create an account" className="bg-red-600 py-2 px-10 text-sm  rounded" />
          </Link>
        </View>
      </Container>
    </View>
  );
}

