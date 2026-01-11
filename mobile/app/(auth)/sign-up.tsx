import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Container } from '@/components/ui/Container';
import { Select } from '@/components/ui/Select';
import { authAPI, SignUpData } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen() {
  const router = useRouter();
  const { refetch } = authAPI.useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <ScrollView className="flex flex-1 bg-black py-20">
      <Stack.Screen options={{ title: 'Sign Up', headerShown: false }} />
      <Container>
        <Text className="mb-4 text-2xl font-semibold text-white mb-10">Create account</Text>
        {error ? <Text className="mb-2 text-red-600">{error}</Text> : null}
        <View className="gap-3">
          <View>
            <Label nativeID="name">Name</Label>
            <Input id="name" value={name} onChangeText={setName} placeholder="Enter your name" />
          </View>
          <View>
            <Label nativeID="email">Email</Label>
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
            <Label nativeID="password">Password</Label>
            <Input
              id="password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 10, top: 35 }}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="gray" />
            </TouchableOpacity>
          </View>
          <View className="mt-5">
            <Label nativeID="role">Account Type</Label>
            <View className="mt-2 flex-row gap-2">
              <Button
                title="User"
                onPress={() => setRole('user')}
                className={
                  role === 'user'
                    ? 'flex-1 bg-red-700'
                    : 'flex-1 border border-gray-700 bg-transparent'
                }
              />
              <Button
                title="Admin"
                onPress={() => setRole('admin')}
                className={
                  role === 'admin'
                    ? 'flex-1 bg-red-700'
                    : 'flex-1 border border-gray-700 bg-transparent'
                }
              />
            </View>
          </View>
          <View className="mt-10 gap-3">
            <Button
              title={loading ? 'Creating…' : 'Sign Up'}
              onPress={onSubmit}
              disabled={loading || !email || !password || !name}
              className="bg-red-700"
            />
            <Link href="/(auth)/sign-in" asChild>
              <Button title="Already have an account? Sign In" className="bg-red-700" />
            </Link>
          </View>
        </View>
      </Container>
    </ScrollView>
  );
}
