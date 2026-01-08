import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Container } from '@/components/ui/Container';
import { Select } from '@/components/ui/Select';
import { authAPI, SignUpData } from '@/lib/api';

export default function SignUpScreen() {
  const router = useRouter();
  const { refetch } = authAPI.useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.signUp({
        name,
        email,
        password,
        role,
      });
      console.log('Sign-up successful', result);
      // Force refetch the session to update the auth router
      await refetch();
      router.push('/(auth)/sign-in');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex flex-1 bg-white">
      <Stack.Screen options={{ title: 'Sign Up', headerShown: false }} />
      <Container>
        <Text className="text-2xl font-semibold mb-4">Create account</Text>
        {error ? <Text className="text-red-600 mb-2">{error}</Text> : null}
        <View className="gap-3">
          <View>
            <Label nativeID="name">Name</Label>
            <Input id="name" value={name} onChangeText={setName} placeholder="Your name" />
          </View>
          <View>
            <Label nativeID="email">Email</Label>
            <Input id="email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View>
            <Label nativeID="password">Password</Label>
            <Input id="password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          </View>
          <View>
            <Label nativeID="role">Account Type</Label>
            <View className="flex-row gap-2 mt-2">
              <Button
                title="User"
                onPress={() => setRole('user')}
                className={role === 'user' ? 'flex-1 bg-blue-600' : 'flex-1 bg-gray-300'}
              />
              <Button
                title="Admin"
                onPress={() => setRole('admin')}
                className={role === 'admin' ? 'flex-1 bg-blue-600' : 'flex-1 bg-gray-300'}
              />
            </View>
          </View>
          <Button title={loading ? 'Creating…' : 'Sign Up'} onPress={onSubmit} disabled={loading || !email || !password || !name} />
          <Link href="/(auth)/sign-in" asChild>
            <Button title="Already have an account? Sign In" className="bg-gray-200" />
          </Link>
        </View>
      </Container>
    </ScrollView>
  );
}
