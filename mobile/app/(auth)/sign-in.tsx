import { useState } from 'react';
import { View, Text } from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Container } from '@/components/ui/Container';
import { signIn } from '@/lib/auth-client';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {


    setLoading(true);
    setError(null);
    try {
      await signIn.email({ email, password });
      router.push('/(admin)');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex flex-1 bg-white">
      <Stack.Screen options={{ title: 'Sign In', headerShown: false }} />
      <Container>
        <Text className="text-2xl font-semibold mb-4">Welcome back</Text>
        {error ? <Text className="text-red-600 mb-2">{error}</Text> : null}
        <View className="gap-3">
          <View>
            <Label nativeID="email">Email</Label>
            <Input id="email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View>
            <Label nativeID="password">Password</Label>
            <Input id="password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          </View>
          <Button title={loading ? 'Signing in…' : 'Sign In'} onPress={onSubmit} disabled={loading || !email || !password} />
          <Link href="/(auth)/sign-up" asChild>
            <Button title="Create an account" className="bg-gray-200" />
          </Link>
        </View>
      </Container>
    </View>
  );
}
