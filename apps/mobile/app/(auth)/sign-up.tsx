import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, Link, useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { authAPI } from '@/lib/api';
import { useSession } from '@/lib/api/auth';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/Alert';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; redirect?: string }>();
  const { refetch } = useSession();
  const isFromInvitation = !!params.email && params.redirect === 'invitations';
  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      await authAPI.signUp({ name, email, password });
      await refetch();
      if (isFromInvitation) {
        router.replace(ROUTES.ADMIN.ACCEPT_INVITATION);
      } else {
        router.replace(ROUTES.ADMIN.HOME);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignUp() {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await authAPI.signInWithGoogle();
      // After the OAuth flow, refetch session and navigate
      await refetch();
      if (result?.data && 'user' in result.data && result.data.user) {
        if (isFromInvitation) {
          router.replace(ROUTES.ADMIN.ACCEPT_INVITATION);
        } else {
          router.replace(ROUTES.ADMIN.HOME);
        }
      }
      // If no user data (web redirect), the _layout will handle navigation
    } catch (e: any) {
      setError(e?.message ?? 'Google sign up failed');
    } finally {
      setGoogleLoading(false);
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
              editable={!isFromInvitation}
              className={isFromInvitation ? 'opacity-60' : ''}
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

          <Button
            title="Sign Up"
            loading={loading}
            onPress={onSubmit}
            disabled={loading || googleLoading || !email || !password || !name}
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
            onPress={onGoogleSignUp}
            disabled={loading || googleLoading}
            size="lg"
            icon={!googleLoading ? <AntDesign name="google" size={20} color="#fff" /> : undefined}
          />

          <Link href={ROUTES.AUTH.SIGN_IN} asChild>
            <Button title="Already have an account? Sign In" variant="ghost" />
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
