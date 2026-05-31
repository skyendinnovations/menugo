import { View, Text, ScrollView, Switch, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { notificationAPI } from '@/lib/api/notification';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MaterialIcons } from '@expo/vector-icons';
import type { NotificationSettingsMatrix } from '@menugo/dto';

export default function NotificationSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [matrix, setMatrix] = useState<NotificationSettingsMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const restaurantId = Number(id);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getSettings(restaurantId);
      setMatrix(res.data || []);
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [fetchSettings])
  );

  const handleToggle = async (triggerEvent: string, roleId: number, currentValue: boolean) => {
    // Optimistic update
    setMatrix((prev) => updateEventRole(prev, triggerEvent, roleId, !currentValue));

    try {
      await notificationAPI.updateSettings(restaurantId, [
        { triggerEvent, roleId, enabled: !currentValue },
      ]);
    } catch (error) {
      console.error('Failed to update setting:', error);
      // Revert on error
      setMatrix((prev) => updateEventRole(prev, triggerEvent, roleId, currentValue));
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      await notificationAPI.seedDefaults(restaurantId);
      await fetchSettings();
    } catch (error) {
      console.error('Failed to seed defaults:', error);
    } finally {
      setSeeding(false);
    }
  };

  const hasAnyEnabled = matrix.some((event) =>
    event.roles.some((role) => role.enabled)
  );

  const updateEventRole = (
    prev: NotificationSettingsMatrix[],
    triggerEvent: string,
    roleId: number,
    enabled: boolean
  ) =>
    prev.map((event) => {
      if (event.triggerEvent !== triggerEvent) return event;
      return {
        ...event,
        roles: event.roles.map((role) => {
          if (role.roleId !== roleId) return role;
          return { ...role, enabled };
        }),
      };
    });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-white">
        <View className="flex-row items-center gap-3 border-b border-gray-200 px-5 pb-4" style={{ paddingTop: insets.top + 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100 active:opacity-70">
            <MaterialIcons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-black">Notification Flow</Text>
            <Text className="text-sm text-gray-600">
              Configure who gets notified for each order event
            </Text>
          </View>
        </View>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>

        {!hasAnyEnabled && (
          <Card className="mb-4 border border-amber-500/30">
            <CardContent className="flex-row items-center gap-3 p-4">
              <MaterialIcons name="info-outline" size={20} color="#F59E0B" />
              <View className="flex-1">
                <Text className="text-sm text-amber-700">
                  No notifications configured yet. Load defaults to get started.
                </Text>
              </View>
              <Button
                title="Load Defaults"
                size="sm"
                variant="primary"
                loading={seeding}
                onPress={handleSeedDefaults}
              />
            </CardContent>
          </Card>
        )}

        {matrix.map((event) => (
          <Card key={event.triggerEvent} className="mb-4">
            <CardContent className="p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <MaterialIcons
                  name={getEventIcon(event.triggerEvent)}
                  size={20}
                  color={getEventColor(event.triggerEvent)}
                />
                <Text className="text-base font-bold text-black">{event.label}</Text>
              </View>

              {event.roles.length === 0 ? (
                <Text className="text-sm text-gray-500">
                  No roles available. Create roles first.
                </Text>
              ) : (
                event.roles.map((role) => (
                  <View
                    key={role.roleId}
                    className="flex-row items-center justify-between border-t border-gray-200 py-3">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="person" size={16} color="#94A3B8" />
                      <Text className="text-sm capitalize text-gray-700">{role.roleName}</Text>
                    </View>
                    <Switch
                      value={role.enabled}
                      onValueChange={() =>
                        handleToggle(event.triggerEvent, role.roleId, role.enabled)
                      }
                      trackColor={{ false: '#334155', true: '#F9731680' }}
                      thumbColor={role.enabled ? '#F97316' : '#64748B'}
                    />
                  </View>
                ))
              )}
            </CardContent>
          </Card>
        ))}

        {hasAnyEnabled && (
          <TouchableOpacity
            onPress={handleSeedDefaults}
            disabled={seeding}
            className="mb-6 items-center py-3">
            <Text className="text-sm text-gray-500">
              {seeding ? 'Loading...' : 'Reset to defaults'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </View>
    </>
  );
}

function getEventIcon(event: string): keyof typeof MaterialIcons.glyphMap {
  const icons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    order_placed: 'add-shopping-cart',
    status_received_to_preparing: 'soup-kitchen',
    status_preparing_to_ready: 'check-circle',
    status_ready_to_served: 'room-service',
    status_served_to_paid: 'payments',
    order_cancelled: 'cancel',
  };
  return icons[event] || 'notifications';
}

function getEventColor(event: string): string {
  const colors: Record<string, string> = {
    order_placed: '#3B82F6',
    status_received_to_preparing: '#F97316',
    status_preparing_to_ready: '#22C55E',
    status_ready_to_served: '#06B6D4',
    status_served_to_paid: '#8B5CF6',
    order_cancelled: '#EF4444',
  };
  return colors[event] || '#F59E0B';
}
