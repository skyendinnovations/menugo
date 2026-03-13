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
  Modal,
  FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { restaurantAPI } from '@/lib/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SUPPORTED_CURRENCIES } from '@menugo/dto';

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

const TABLE_RANGE_OPTIONS = [
  { label: 'Under 10 tables', value: 'under_10' },
  { label: '10 to 20 tables', value: '10_to_20' },
  { label: '20 to 40 tables', value: '20_to_40' },
  { label: '40 to 50 tables', value: '40_to_50' },
];

/* ── Picker Modal ─────────────────────────────────────────────── */
function PickerModal({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { label: string; value: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
        }}>
        <View
          style={{
            backgroundColor: WHITE,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '70%',
            paddingBottom: Platform.OS === 'ios' ? 34 : 16,
          }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: GRAY_200,
            }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: GRAY_900 }}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={GRAY_500} />
            </TouchableOpacity>
          </View>

          {/* Search (only for long lists) */}
          {options.length > 10 && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
              <View style={inputRow(false)}>
                <Ionicons name="search" size={18} color={GRAY_400} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search…"
                  placeholderTextColor={GRAY_400}
                  style={{ ...fieldText, paddingVertical: 12 }}
                />
              </View>
            </View>
          )}

          {/* Options */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                    setSearch('');
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: selected ? RED_LIGHT : WHITE,
                  }}>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: selected ? RED : GRAY_900,
                      fontWeight: selected ? '600' : '400',
                    }}>
                    {item.label}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={RED} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

/* ── Main Screen ──────────────────────────────────────────────── */
export default function CreateRestaurant() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    currency: 'INR',
    tableCountRange: '',
  });
  const [focused, setFocused] = useState('');
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [tableRangePickerOpen, setTableRangePickerOpen] = useState(false);

  const descRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const currencyLabel =
    SUPPORTED_CURRENCIES.find((c) => c.value === form.currency)?.label || 'Select currency';
  const tableRangeLabel =
    TABLE_RANGE_OPTIONS.find((o) => o.value === form.tableCountRange)?.label || '';

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Restaurant name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await restaurantAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        currency: form.currency,
        tableCountRange: form.tableCountRange || undefined,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: WHITE }}>
      <Stack.Screen options={{ title: 'Create Restaurant', headerShown: false }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => router.back()}
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
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: GRAY_900 }}>
                New Restaurant
              </Text>
              <Text style={{ fontSize: 14, color: GRAY_500, marginTop: 2 }}>
                Fill in the details to add a restaurant
              </Text>
            </View>
          </View>

          {/* Icon */}
          <View style={{ alignItems: 'center', marginVertical: 24 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: RED_LIGHT,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcons name="store" size={32} color={RED} />
            </View>
          </View>

          {/* Error */}
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
          <View style={{ marginBottom: 16 }}>
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
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                style={fieldText}
              />
            </View>
          </View>

          {/* Currency Picker */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
              Currency
            </Text>
            <TouchableOpacity
              onPress={() => setCurrencyPickerOpen(true)}
              activeOpacity={0.7}
              style={{
                ...inputRow(false),
                paddingVertical: Platform.OS === 'web' ? 14 : 16,
              }}>
              <MaterialIcons name="attach-money" size={20} color={GRAY_400} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: form.currency ? GRAY_900 : GRAY_400,
                  paddingHorizontal: 10,
                }}
                numberOfLines={1}>
                {currencyLabel}
              </Text>
              <Ionicons name="chevron-down" size={20} color={GRAY_400} />
            </TouchableOpacity>
          </View>

          {/* Table Count Range Picker */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
              Table Count Range
            </Text>
            <TouchableOpacity
              onPress={() => setTableRangePickerOpen(true)}
              activeOpacity={0.7}
              style={{
                ...inputRow(false),
                paddingVertical: Platform.OS === 'web' ? 14 : 16,
              }}>
              <MaterialIcons name="table-restaurant" size={20} color={GRAY_400} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: form.tableCountRange ? GRAY_900 : GRAY_400,
                  paddingHorizontal: 10,
                }}
                numberOfLines={1}>
                {tableRangeLabel || 'Select range'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={GRAY_400} />
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={loading || !form.name.trim()}
            activeOpacity={0.85}
            style={{
              backgroundColor: loading || !form.name.trim() ? RED_MUTED : RED,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              marginBottom: 32,
              ...Platform.select({
                ios: {
                  shadowColor: RED,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: loading || !form.name.trim() ? 0 : 0.25,
                  shadowRadius: 8,
                },
                android: { elevation: loading || !form.name.trim() ? 0 : 6 },
                default: {
                  boxShadow:
                    loading || !form.name.trim()
                      ? 'none'
                      : '0 4px 14px rgba(220,38,38,0.3)',
                } as any,
              }),
            }}>
            {loading ? <ActivityIndicator color={WHITE} size="small" /> : null}
            <Text style={{ color: WHITE, fontSize: 17, fontWeight: '600' }}>
              {loading ? 'Creating…' : 'Create Restaurant'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <PickerModal
        visible={currencyPickerOpen}
        onClose={() => setCurrencyPickerOpen(false)}
        title="Select Currency"
        options={SUPPORTED_CURRENCIES}
        value={form.currency}
        onSelect={(currency) => setForm((p) => ({ ...p, currency }))}
      />
      <PickerModal
        visible={tableRangePickerOpen}
        onClose={() => setTableRangePickerOpen(false)}
        title="Table Count Range"
        options={TABLE_RANGE_OPTIONS}
        value={form.tableCountRange}
        onSelect={(tableCountRange) => setForm((p) => ({ ...p, tableCountRange }))}
      />
    </KeyboardAvoidingView>
  );
}
