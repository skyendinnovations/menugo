import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { memberAPI, type Role } from '@/lib/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

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
const GREEN = '#16A34A';
const GREEN_LIGHT = '#F0FDF4';

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

export default function InviteMember() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [focused, setFocused] = useState('');
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  const restaurantId = Number(id);

  const selectedRoleName = roles.find((r) => String(r.id) === selectedRole)?.name || '';

  useEffect(() => {
    (async () => {
      try {
        const res = await memberAPI.getRoles(restaurantId);
        setRoles((res.data || []).filter((r) => r.name !== 'owner'));
      } catch (err) {
        console.error('Failed to load roles:', err);
      }
    })();
  }, [restaurantId]);

  const handleInvite = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await memberAPI.inviteMember(restaurantId, email.trim(), [
        Number(selectedRole),
      ]);
      setSuccess(`Invitation sent! Token: ${result.data.token}`);
      setEmail('');
      setSelectedRole('');
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: WHITE }}>
      <Stack.Screen options={{ title: 'Invite Member', headerShown: false }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'flex-start',
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
              <Text style={{ fontSize: 24, fontWeight: '700', color: GRAY_900 }}>Invite Member</Text>
              <Text style={{ fontSize: 14, color: GRAY_500, marginTop: 2 }}>
                Send an invitation to join your restaurant
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
              <Ionicons name="person-add" size={32} color={RED} />
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

          {/* Success */}
          {success ? (
            <View
              style={{
                backgroundColor: GREEN_LIGHT,
                borderWidth: 1,
                borderColor: '#BBF7D0',
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}>
              <Ionicons name="checkmark-circle" size={20} color={GREEN} />
              <Text style={{ color: '#166534', fontSize: 14, flex: 1 }}>{success}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
              Email Address <Text style={{ color: RED }}>*</Text>
            </Text>
            <View style={inputRow(focused === 'email')}>
              <Ionicons name="mail-outline" size={20} color={focused === 'email' ? RED : GRAY_400} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
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

          {/* Role Picker */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: GRAY_700, marginBottom: 8 }}>
              Role <Text style={{ color: RED }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setRolePickerOpen(true)}
              activeOpacity={0.7}
              style={{
                ...inputRow(false),
                paddingVertical: Platform.OS === 'web' ? 14 : 16,
              }}>
              <MaterialIcons name="badge" size={20} color={GRAY_400} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: selectedRole ? GRAY_900 : GRAY_400,
                  paddingHorizontal: 10,
                }}>
                {selectedRoleName
                  ? selectedRoleName.charAt(0).toUpperCase() + selectedRoleName.slice(1)
                  : 'Select a role'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={GRAY_400} />
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleInvite}
            disabled={loading || !email.trim() || !selectedRole}
            activeOpacity={0.85}
            style={{
              backgroundColor: loading || !email.trim() || !selectedRole ? RED_MUTED : RED,
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
                  shadowOpacity: loading ? 0 : 0.25,
                  shadowRadius: 8,
                },
                android: { elevation: loading ? 0 : 6 },
                default: {
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(220,38,38,0.3)',
                } as any,
              }),
            }}>
            {loading ? <ActivityIndicator color={WHITE} size="small" /> : null}
            <Text style={{ color: WHITE, fontSize: 17, fontWeight: '600' }}>
              {loading ? 'Sending…' : 'Send Invitation'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Role Picker Modal */}
      <Modal visible={rolePickerOpen} transparent animationType="slide" onRequestClose={() => setRolePickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: WHITE,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '60%',
              paddingBottom: Platform.OS === 'ios' ? 34 : 16,
            }}>
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
              <Text style={{ fontSize: 18, fontWeight: '600', color: GRAY_900 }}>Select Role</Text>
              <TouchableOpacity onPress={() => setRolePickerOpen(false)}>
                <Ionicons name="close" size={24} color={GRAY_500} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={roles}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const selected = String(item.id) === selectedRole;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedRole(String(item.id));
                      setRolePickerOpen(false);
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
                      {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={RED} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
