import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { memberAPI, type Role } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';

export default function InviteMember() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);

  const restaurantId = Number(id);

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
      const result = await memberAPI.inviteMember(restaurantId, email.trim(), [Number(selectedRole)]);
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
    <>
      <Stack.Screen options={{ title: 'Invite Member', headerStyle: { backgroundColor: '#0F172A' }, headerTintColor: '#F8FAFC', headerShadowVisible: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-slate-900"
      >
        <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
          {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}
          {success ? <Alert variant="success" description={success} className="mb-5" /> : null}

          <View className="gap-5">
            <View>
              <Label required>Email</Label>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View>
              <Label required>Role</Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
                options={roles.map((r) => ({
                  label: r.name.charAt(0).toUpperCase() + r.name.slice(1),
                  value: String(r.id),
                }))}
                placeholder="Select a role"
              />
            </View>
            <Button
              title="Send Invitation"
              loading={loading}
              onPress={handleInvite}
              disabled={loading}
              size="lg"
              className="mt-2"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
