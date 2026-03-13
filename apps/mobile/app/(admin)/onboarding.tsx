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
import { Stack, useRouter } from 'expo-router';
import { restaurantAPI, tableAPI, type Restaurant } from '@/lib/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

/* ── Theme tokens (matching Sign-In / Sign-Up) ────────────────── */
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
const GREEN = '#16A34A';
const GREEN_LIGHT = '#F0FDF4';

/* ── Shared style helpers ─────────────────────────────────────── */
const inputRow = (focused: boolean) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  borderWidth: 1.5,
  borderColor: focused ? RED : GRAY_200,
  borderRadius: 12,
  backgroundColor: GRAY_50,
  paddingHorizontal: 14,
});

const fieldText = {
  flex: 1,
  paddingVertical: Platform.OS === 'web' ? 14 : 16,
  paddingHorizontal: 10,
  fontSize: 16,
  color: GRAY_900,
  ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
};

const primaryBtn = (disabled: boolean) => ({
  backgroundColor: disabled ? RED_MUTED : RED,
  borderRadius: 12,
  paddingVertical: 16,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  flexDirection: 'row' as const,
  gap: 8,
  ...Platform.select({
    ios: {
      shadowColor: RED,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: disabled ? 0 : 0.25,
      shadowRadius: 8,
    },
    android: { elevation: disabled ? 0 : 6 },
    default: {
      boxShadow: disabled ? 'none' : '0 4px 14px rgba(220,38,38,0.3)',
    } as any,
  }),
});

const outlineBtn = {
  borderWidth: 1.5,
  borderColor: GRAY_200,
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  flexDirection: 'row' as const,
  gap: 8,
  backgroundColor: WHITE,
};

const ghostBtn = {
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  flexDirection: 'row' as const,
  gap: 8,
};

/* ── Error Banner ─────────────────────────────────────────────── */
function ErrorBanner({ message }: { message: string }) {
  return (
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
      <Text style={{ color: '#991B1B', fontSize: 14, flex: 1 }}>{message}</Text>
    </View>
  );
}

/* ── Progress Dots ────────────────────────────────────────────── */
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: i <= current ? RED : GRAY_200,
            width: i === current ? 32 : 8,
          }}
        />
      ))}
    </View>
  );
}

/* ── Step 0: Welcome ──────────────────────────────────────────── */
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      {/* Logo */}
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          backgroundColor: RED_LIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
        <Ionicons name="restaurant" size={44} color={RED} />
      </View>

      <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 }}>
        <Text style={{ color: GRAY_900 }}>Menu</Text>
        <Text style={{ color: RED }}>Go</Text>
      </Text>

      <Text style={{ fontSize: 28, fontWeight: '700', color: GRAY_900, textAlign: 'center', marginTop: 16 }}>
        Welcome!
      </Text>
      <Text style={{ fontSize: 16, color: GRAY_500, textAlign: 'center', marginTop: 10, lineHeight: 24 }}>
        Manage your restaurant's menus, tables, orders, and staff — all in one place.
      </Text>
      <Text style={{ fontSize: 14, color: GRAY_400, textAlign: 'center', marginTop: 16 }}>
        Let's set up your first restaurant to get started.
      </Text>

      <TouchableOpacity
        onPress={onNext}
        activeOpacity={0.85}
        style={{ ...primaryBtn(false), width: '100%', marginTop: 40 }}>
        <Text style={{ color: WHITE, fontSize: 17, fontWeight: '600' }}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color={WHITE} />
      </TouchableOpacity>
    </View>
  );
}

/* ── Step 1: Restaurant Details ───────────────────────────────── */
function RestaurantDetailsStep({
  onNext,
  onBack,
}: {
  onNext: (restaurant: Restaurant) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
  });
  const [focused, setFocused] = useState('');

  const descRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Restaurant name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await restaurantAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      onNext(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: GRAY_200,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: WHITE,
          }}>
          <Ionicons name="arrow-back" size={20} color={GRAY_700} />
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: '700', color: GRAY_900 }}>Restaurant Details</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      {/* Name */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
          Restaurant Name <Text style={{ color: RED }}>*</Text>
        </Text>
        <View style={inputRow(focused === 'name')}>
          <MaterialIcons name="store" size={20} color={focused === 'name' ? RED : GRAY_400} />
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((p) => ({ ...p, name }))}
            placeholder="Enter restaurant name"
            placeholderTextColor={GRAY_400}
            returnKeyType="next"
            onSubmitEditing={() => descRef.current?.focus()}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused('')}
            style={fieldText}
          />
        </View>
      </View>

      {/* Description */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
          Description
        </Text>
        <View style={inputRow(focused === 'desc')}>
          <MaterialIcons name="description" size={20} color={focused === 'desc' ? RED : GRAY_400} />
          <TextInput
            ref={descRef}
            value={form.description}
            onChangeText={(description) => setForm((p) => ({ ...p, description }))}
            placeholder="Brief description of your restaurant"
            placeholderTextColor={GRAY_400}
            multiline
            numberOfLines={3}
            returnKeyType="next"
            onSubmitEditing={() => addressRef.current?.focus()}
            onFocus={() => setFocused('desc')}
            onBlur={() => setFocused('')}
            style={{ ...fieldText, minHeight: 60, textAlignVertical: 'top' }}
          />
        </View>
      </View>

      {/* Address */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
          Address
        </Text>
        <View style={inputRow(focused === 'address')}>
          <Ionicons name="location-outline" size={20} color={focused === 'address' ? RED : GRAY_400} />
          <TextInput
            ref={addressRef}
            value={form.address}
            onChangeText={(address) => setForm((p) => ({ ...p, address }))}
            placeholder="Restaurant address"
            placeholderTextColor={GRAY_400}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            onFocus={() => setFocused('address')}
            onBlur={() => setFocused('')}
            style={fieldText}
          />
        </View>
      </View>

      {/* Phone */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
          Phone
        </Text>
        <View style={inputRow(focused === 'phone')}>
          <Ionicons name="call-outline" size={20} color={focused === 'phone' ? RED : GRAY_400} />
          <TextInput
            ref={phoneRef}
            value={form.phone}
            onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
            placeholder="Phone number"
            placeholderTextColor={GRAY_400}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            onFocus={() => setFocused('phone')}
            onBlur={() => setFocused('')}
            style={fieldText}
          />
        </View>
      </View>

      {/* Email */}
      <View style={{ marginBottom: 28 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
          Email
        </Text>
        <View style={inputRow(focused === 'email')}>
          <Ionicons name="mail-outline" size={20} color={focused === 'email' ? RED : GRAY_400} />
          <TextInput
            ref={emailRef}
            value={form.email}
            onChangeText={(email) => setForm((p) => ({ ...p, email }))}
            placeholder="Contact email"
            placeholderTextColor={GRAY_400}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused('')}
            style={fieldText}
          />
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        onPress={handleCreate}
        disabled={loading || !form.name.trim()}
        activeOpacity={0.85}
        style={primaryBtn(loading || !form.name.trim())}>
        {loading ? <ActivityIndicator color={WHITE} size="small" /> : null}
        <Text style={{ color: WHITE, fontSize: 17, fontWeight: '600' }}>
          {loading ? 'Creating…' : 'Create & Continue'}
        </Text>
        {!loading ? <Ionicons name="arrow-forward" size={18} color={WHITE} /> : null}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ── Step 2: Table Setup ──────────────────────────────────────── */
function TableSetupStep({ restaurant, onNext }: { restaurant: Restaurant; onNext: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('10');
  const [capacity, setCapacity] = useState('4');
  const [focused, setFocused] = useState('');

  const toRef = useRef<TextInput>(null);
  const capRef = useRef<TextInput>(null);

  const handleCreate = async () => {
    const fromNum = parseInt(from, 10);
    const toNum = parseInt(to, 10);
    const capNum = parseInt(capacity, 10);

    if (isNaN(fromNum) || isNaN(toNum) || fromNum < 1 || toNum < fromNum) {
      setError('Please enter valid table numbers (From must be less than To)');
      return;
    }
    if (isNaN(capNum) || capNum < 1) {
      setError('Please enter a valid capacity');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await tableAPI.bulkCreate(restaurant.id, fromNum, toNum, capNum);
      onNext();
    } catch (err: any) {
      setError(err.message || 'Failed to create tables');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* Icon + Heading */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: RED_LIGHT,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
          <MaterialIcons name="table-restaurant" size={32} color={RED} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: GRAY_900 }}>Table Setup</Text>
        <Text style={{ fontSize: 15, color: GRAY_500, textAlign: 'center', marginTop: 6 }}>
          Create tables for your restaurant. You can always add more later.
        </Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      {/* Table range row */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
            From Table # <Text style={{ color: RED }}>*</Text>
          </Text>
          <View style={inputRow(focused === 'from')}>
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="1"
              placeholderTextColor={GRAY_400}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => toRef.current?.focus()}
              onFocus={() => setFocused('from')}
              onBlur={() => setFocused('')}
              style={{ ...fieldText, textAlign: 'center', paddingHorizontal: 4 }}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
            To Table # <Text style={{ color: RED }}>*</Text>
          </Text>
          <View style={inputRow(focused === 'to')}>
            <TextInput
              ref={toRef}
              value={to}
              onChangeText={setTo}
              placeholder="10"
              placeholderTextColor={GRAY_400}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => capRef.current?.focus()}
              onFocus={() => setFocused('to')}
              onBlur={() => setFocused('')}
              style={{ ...fieldText, textAlign: 'center', paddingHorizontal: 4 }}
            />
          </View>
        </View>
      </View>

      {/* Capacity */}
      <View style={{ marginBottom: 28 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
          Capacity per Table <Text style={{ color: RED }}>*</Text>
        </Text>
        <View style={inputRow(focused === 'cap')}>
          <Ionicons name="people-outline" size={20} color={focused === 'cap' ? RED : GRAY_400} />
          <TextInput
            ref={capRef}
            value={capacity}
            onChangeText={setCapacity}
            placeholder="4"
            placeholderTextColor={GRAY_400}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            onFocus={() => setFocused('cap')}
            onBlur={() => setFocused('')}
            style={fieldText}
          />
        </View>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        onPress={handleCreate}
        disabled={loading}
        activeOpacity={0.85}
        style={primaryBtn(loading)}>
        {loading ? <ActivityIndicator color={WHITE} size="small" /> : null}
        <Text style={{ color: WHITE, fontSize: 17, fontWeight: '600' }}>
          {loading ? 'Creating Tables…' : 'Create Tables'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onNext}
        activeOpacity={0.7}
        style={{ ...ghostBtn, marginTop: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: GRAY_500 }}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ── Step 3: Complete ─────────────────────────────────────────── */
function CompleteStep({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      {/* Success icon */}
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          backgroundColor: GREEN_LIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
        <Ionicons name="checkmark-circle" size={48} color={GREEN} />
      </View>

      <Text style={{ fontSize: 28, fontWeight: '700', color: GRAY_900, textAlign: 'center' }}>
        You're all set!
      </Text>
      <Text style={{ fontSize: 16, color: GRAY_500, textAlign: 'center', marginTop: 10, lineHeight: 24 }}>
        Your restaurant "{restaurant.name}" has been created successfully.
      </Text>

      {/* Actions */}
      <View style={{ width: '100%', marginTop: 36, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.replace(ROUTES.ADMIN.RESTAURANTS.detail(restaurant.id) as any)}
          activeOpacity={0.85}
          style={primaryBtn(false)}>
          <Ionicons name="grid-outline" size={20} color={WHITE} />
          <Text style={{ color: WHITE, fontSize: 17, fontWeight: '600' }}>Go to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace(ROUTES.ADMIN.MENU.list(restaurant.id) as any)}
          activeOpacity={0.7}
          style={outlineBtn}>
          <Ionicons name="restaurant-outline" size={20} color={GRAY_900} />
          <Text style={{ fontSize: 16, fontWeight: '500', color: GRAY_900 }}>Set up Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace(ROUTES.ADMIN.MEMBERS.invite(restaurant.id) as any)}
          activeOpacity={0.7}
          style={ghostBtn}>
          <Ionicons name="people-outline" size={20} color={RED} />
          <Text style={{ fontSize: 16, fontWeight: '500', color: RED }}>Invite Staff</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── Main Screen ──────────────────────────────────────────────── */
export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const handleRestaurantCreated = (r: Restaurant) => {
    setRestaurant(r);
    setStep(2);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: WHITE }}>
      <Stack.Screen options={{ title: 'Onboarding', headerShown: false }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: step === 0 || step === 3 ? 'center' : 'flex-start',
          paddingVertical: 48,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          {/* Progress */}
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <ProgressDots current={step} total={4} />
            <Text style={{ fontSize: 13, color: GRAY_400, textAlign: 'center', fontWeight: '500' }}>
              Step {step + 1} of 4
            </Text>
          </View>

          {/* Steps */}
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && (
            <RestaurantDetailsStep onNext={handleRestaurantCreated} onBack={() => setStep(0)} />
          )}
          {step === 2 && restaurant && (
            <TableSetupStep restaurant={restaurant} onNext={() => setStep(3)} />
          )}
          {step === 3 && restaurant && <CompleteStep restaurant={restaurant} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
