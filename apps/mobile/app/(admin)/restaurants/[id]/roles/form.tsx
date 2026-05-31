import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { memberAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { PERMISSION_KEYS } from '@menugo/dto';
import { PERMISSION_LABELS } from './_constants';

export default function RoleFormScreen() {
  const { id, roleId } = useLocalSearchParams<{ id: string; roleId?: string }>();
  const router = useRouter();
  const restaurantId = Number(id);
  const isEdit = !!roleId;

  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          setLoading(true);
          const res = await memberAPI.getRoles(restaurantId);
          const role = res.data?.find((r) => r.id === Number(roleId));
          if (role) {
            setName(role.name);
            setPermissions(role.permissions || {});
          }
        } catch (error) {
          console.error('Failed to fetch role:', error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isEdit, roleId, restaurantId]);

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        await memberAPI.updateRole(restaurantId, Number(roleId), {
          name: name.trim(),
          permissions,
        });
        Alert.alert('Success', 'Role updated');
      } else {
        await memberAPI.createRole(restaurantId, name.trim(), permissions);
        Alert.alert('Success', 'Role created');
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: isEdit ? 'Edit Role' : 'Create Role' }} />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? 'Edit Role' : 'Create Role' }} />
      <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="mb-2 text-sm font-medium text-gray-700">Role Name</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Shift Manager"
          autoCapitalize="words"
        />

        <Text className="mb-3 mt-6 text-sm font-medium text-gray-700">Permissions</Text>
        <View className="gap-1">
          {PERMISSION_KEYS.map((key) => (
            <Switch
              key={key}
              checked={!!permissions[key]}
              onCheckedChange={() => togglePermission(key)}
              label={PERMISSION_LABELS[key] || key}
              className="rounded-xl bg-gray-50 px-4 py-3.5"
            />
          ))}
        </View>

        <Button
          title={saving ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
          onPress={handleSave}
          disabled={saving}
          className="mt-8"
        />
      </ScrollView>
    </>
  );
}
