import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, Link, useRouter, useLocalSearchParams } from 'expo-router';
import { authAPI } from '@/lib/api';
import { useSession } from '@/lib/api/auth';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

/* ── Theme tokens ─────────────────────────────────────────────── */
const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const RED_MUTED = '#FCA5A5';
const GRAY_900 = '#111827';
const GRAY_700 = '#374151';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const GRAY_50 = '#F9FAFB';
const WHITE = '#FFFFFF';

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; redirect?: string }>();
  const { refetch } = useSession();
  const isFromInvitation = !!params.email && params.redirect === 'invitations';

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const isSubmitDisabled =
    loading || googleLoading || !name.trim() || !email.trim() || !password;

  /* ── Email / password sign-up ───────────────────────────────── */
  async function onSubmit() {
    if (isSubmitDisabled) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authAPI.signUp({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      if (result?.error) {
        setError(result.error.message || 'Failed to create account');
        return;
      }
      await refetch();
      router.replace(
        isFromInvitation ? ROUTES.ADMIN.ACCEPT_INVITATION : ROUTES.ADMIN.HOME,
      );
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Google sign-up ─────────────────────────────────────────── */
  async function onGoogleSignUp() {
    if (loading || googleLoading) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await authAPI.signInWithGoogle();
      if (!result?.data) return; // User cancelled
      await refetch();
      if ('user' in result.data && result.data.user) {
        router.replace(
          isFromInvitation ? ROUTES.ADMIN.ACCEPT_INVITATION : ROUTES.ADMIN.HOME,
        );
      }
      // Web redirect flow – the root _layout handles navigation after callback
    } catch (e: any) {
      setError(e?.message || 'Google sign up failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  /* ── Shared input-row style builder ─────────────────────────── */
  const inputRow = (focused: boolean, disabled?: boolean) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: focused ? RED : GRAY_200,
    borderRadius: 12,
    backgroundColor: disabled ? '#F3F4F6' : GRAY_50,
    paddingHorizontal: 14,
    opacity: disabled ? 0.7 : 1,
  });

  const fieldText = {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 14 : 16,
    paddingHorizontal: 10,
    fontSize: 16,
    color: GRAY_900,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  };

  /* ── UI ─────────────────────────────────────────────────────── */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: WHITE }}>
      <Stack.Screen options={{ title: 'Sign Up', headerShown: false }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          {/* ── Logo ────────────────────────────────────────────── */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: RED_LIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
              <Ionicons name="restaurant" size={36} color={RED} />
            </View>
            <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: -0.5 }}>
              <Text style={{ color: GRAY_900 }}>Menu</Text>
              <Text style={{ color: RED }}>Go</Text>
            </Text>
          </View>

          {/* ── Heading ─────────────────────────────────────────── */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: GRAY_900 }}>
              Create account
            </Text>
            <Text style={{ fontSize: 15, color: GRAY_500, marginTop: 6 }}>
              {isFromInvitation
                ? 'Sign up to accept your invitation'
                : 'Get started with MenuGo'}
            </Text>
          </View>

          {/* ── Error banner ────────────────────────────────────── */}
          {error ? (
            <View
              style={{
                backgroundColor: RED_LIGHT,
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}>
              <Ionicons name="alert-circle" size={20} color={RED} />
              <Text style={{ color: '#991B1B', fontSize: 14, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          {/* ── Full name field ─────────────────────────────────── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
              Full name
            </Text>
            <View style={inputRow(nameFocused)}>
              <Ionicons
                name="person-outline"
                size={20}
                color={nameFocused ? RED : GRAY_400}
              />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={GRAY_400}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (!isFromInvitation) emailRef.current?.focus();
                  else passwordRef.current?.focus();
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                style={fieldText}
              />
            </View>
          </View>

          {/* ── Email field ─────────────────────────────────────── */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
              Email address
            </Text>
            <View style={inputRow(emailFocused, isFromInvitation)}>
              {isFromInvitation ? (
                <Ionicons name="lock-closed" size={18} color={GRAY_400} />
              ) : (
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailFocused ? RED : GRAY_400}
                />
              )}
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={GRAY_400}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                editable={!isFromInvitation}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                style={fieldText}
              />
            </View>
          </View>

          {/* ── Password field ──────────────────────────────────── */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
              Password
            </Text>
            <View style={inputRow(passwordFocused)}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? RED : GRAY_400}
              />
              <TextInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={GRAY_400}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                style={fieldText}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button">
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={GRAY_400}
                />
              </TouchableOpacity>
            </View>
            {password.length > 0 && password.length < 8 ? (
              <Text style={{ fontSize: 12, color: RED, marginTop: 6 }}>
                Password must be at least 8 characters
              </Text>
            ) : null}
          </View>

          {/* ── Sign Up button ──────────────────────────────────── */}
          <TouchableOpacity
            onPress={onSubmit}
            disabled={isSubmitDisabled}
            activeOpacity={0.85}
            style={{
              backgroundColor: isSubmitDisabled ? RED_MUTED : RED,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              ...Platform.select({
                ios: {
                  shadowColor: RED,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isSubmitDisabled ? 0 : 0.25,
                  shadowRadius: 8,
                },
                android: { elevation: isSubmitDisabled ? 0 : 6 },
                default: {
                  boxShadow: isSubmitDisabled
                    ? 'none'
                    : '0 4px 14px rgba(220,38,38,0.3)',
                } as any,
              }),
            }}>
            {loading ? <ActivityIndicator color={WHITE} size="small" /> : null}
            <Text style={{ color: WHITE, fontSize: 17, fontWeight: '600' }}>
              {loading ? 'Creating account…' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          {/* ── Divider ─────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 24,
              gap: 12,
            }}>
            <View style={{ flex: 1, height: 1, backgroundColor: GRAY_200 }} />
            <Text style={{ fontSize: 13, color: GRAY_400, fontWeight: '500' }}>
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: GRAY_200 }} />
          </View>

          {/* ── Google button ───────────────────────────────────── */}
          <TouchableOpacity
            onPress={onGoogleSignUp}
            disabled={loading || googleLoading}
            activeOpacity={0.7}
            style={{
              borderWidth: 1.5,
              borderColor: GRAY_200,
              borderRadius: 12,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              backgroundColor: WHITE,
              opacity: loading || googleLoading ? 0.5 : 1,
            }}>
            {googleLoading ? (
              <ActivityIndicator color={RED} size="small" />
            ) : (
              <AntDesign name="google" size={20} color="#EA4335" />
            )}
            <Text style={{ fontSize: 16, fontWeight: '500', color: GRAY_900 }}>
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* ── Sign In link ────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 32,
              gap: 4,
            }}>
            <Text style={{ fontSize: 15, color: GRAY_500 }}>
              Already have an account?
            </Text>
            <Link href={ROUTES.AUTH.SIGN_IN} asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: RED }}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
