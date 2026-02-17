import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type Role } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';
import { PERMISSION_LABELS } from './_constants';

const DEFAULT_ROLE_NAMES = ['owner', 'manager', 'kitchen', 'waiter', 'cashier'];

export default function RolesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const restaurantId = Number(id);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await memberAPI.getRoles(restaurantId);
      setRoles(res.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      fetchRoles();
    }, [fetchRoles])
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await memberAPI.deleteRole(restaurantId, deleteTarget.id);
      setDeleteTarget(null);
      fetchRoles();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  const isDefault = (role: Role) => DEFAULT_ROLE_NAMES.includes(role.name.toLowerCase());

  const getEnabledPermissions = (role: Role) =>
    Object.entries(role.permissions || {})
      .filter(([, v]) => v)
      .map(([key]) => PERMISSION_LABELS[key] || key);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-900 px-5 pt-4">
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">Roles</Text>
          </View>
          <Button
            title="+ Create Role"
            size="sm"
            onPress={() => router.push(ROUTES.ADMIN.ROLES.create(id!) as any)}
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <FlatList
            data={roles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 20 }}
            onRefresh={fetchRoles}
            refreshing={loading}
            renderItem={({ item }) => (
              <Card className="mb-3">
                <CardContent>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-base font-bold text-white capitalize">
                          {item.name}
                        </Text>
                        {isDefault(item) && (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </View>
                      <View className="mt-2 flex-row flex-wrap gap-1.5">
                        {getEnabledPermissions(item).map((label) => (
                          <Badge key={label} variant="outline">
                            {label}
                          </Badge>
                        ))}
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      {item.name.toLowerCase() !== 'owner' && (
                        <TouchableOpacity
                          onPress={() =>
                            router.push(ROUTES.ADMIN.ROLES.edit(id!, item.id) as any)
                          }
                          className="h-9 w-9 items-center justify-center rounded-lg bg-slate-700">
                          <MaterialIcons name="edit" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                      {!isDefault(item) && (
                        <TouchableOpacity
                          onPress={() => setDeleteTarget(item)}
                          className="h-9 w-9 items-center justify-center rounded-lg bg-slate-700">
                          <MaterialIcons name="delete" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </CardContent>
              </Card>
            )}
            ListEmptyComponent={
              <Text className="py-10 text-center text-slate-500">No roles yet</Text>
            }
          />
        )}
      </View>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? Members with this role will
              lose the associated permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              title="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => setDeleteTarget(null)}
            />
            <Button
              title={deleting ? 'Deleting...' : 'Delete'}
              variant="danger"
              size="sm"
              onPress={handleDelete}
              disabled={deleting}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
