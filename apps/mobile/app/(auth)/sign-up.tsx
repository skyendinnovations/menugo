import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { authAPI } from '@/lib/api';
import { useSession } from '@/lib/api/auth';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/Alert';
import { MaterialIcons } from '@expo/vector-icons';

export default function SignUpScreen() {
  const router = useRouter();
  const { refetch } = useSession();
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
      await authAPI.signUp({ name, email, password, role });
      await refetch();
      router.push('/(auth)/sign-in');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900">
      <Stack.Screen options={{ title: 'Sign Up', headerShown: false }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        <View className="mb-8 items-center">
          <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-brand/15">
            <MaterialIcons name="person-add" size={40} color="#F97316" />
          </View>
          <Text className="text-3xl font-bold text-white">Create account</Text>
          <Text className="mt-2 text-base text-slate-400">Get started with MenuGo</Text>
        </View>

        {error ? <Alert variant="destructive" description={error} className="mb-6" /> : null}

        <View className="gap-5">
          <View>
            <Label nativeID="name">Full Name</Label>
            <Input id="name" value={name} onChangeText={setName} placeholder="John Doe" />
          </View>
          <View>
            <Label nativeID="email">Email</Label>
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
            <Label nativeID="password">Password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
            />
          </View>

          <View>
            <Label nativeID="role">Account Type</Label>
            <View className="mt-1 flex-row gap-3">
              <Button
                title="User"
                onPress={() => setRole('user')}
                variant={role === 'user' ? 'primary' : 'ghost'}
                className="flex-1"
              />
              <Button
                title="Admin"
                onPress={() => setRole('admin')}
                variant={role === 'admin' ? 'primary' : 'ghost'}
                className="flex-1"
              />
            </View>
          </View>

          <Button
            title="Sign Up"
            loading={loading}
            onPress={onSubmit}
            disabled={loading || !email || !password || !name}
            size="lg"
            className="mt-4"
          />

          <Link href="/(auth)/sign-in" asChild>
            <Button title="Already have an account? Sign In" variant="ghost" />
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
