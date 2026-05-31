import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert as RNAlert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { kitchenAPI, memberAPI, type Kitchen, type Member } from '@/lib/api';

export default function KitchenManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = Number(id);
  const [name, setName] = useState('');
  const [creatingKitchen, setCreatingKitchen] = useState(false);
  const [items, setItems] = useState<Kitchen[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assigningKitchenId, setAssigningKitchenId] = useState<number | null>(null);
  const [busyKitchenIds, setBusyKitchenIds] = useState<Record<number, boolean>>({});
  const [busyMemberKey, setBusyMemberKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [kRes, mRes] = await Promise.all([kitchenAPI.list(restaurantId), memberAPI.getMembers(restaurantId)]);
    setItems(kRes.data || []);
    setMembers(mRes.data || []);
  }, [restaurantId]);

  const setKitchenBusy = useCallback((kitchenId: number, busy: boolean) => {
    setBusyKitchenIds((current) => ({
      ...current,
      [kitchenId]: busy,
    }));
  }, []);

  const setKitchenActiveLocal = useCallback((kitchenId: number, isActive: boolean) => {
    setItems((currentItems) =>
      currentItems.map((kitchen) =>
        kitchen.id === kitchenId
          ? {
              ...kitchen,
              isActive,
            }
          : kitchen
      )
    );
  }, []);

  const removeKitchenLocal = useCallback((kitchenId: number) => {
    setItems((currentItems) => currentItems.filter((kitchen) => kitchen.id !== kitchenId));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    const kitchenName = name.trim();
    if (!kitchenName || creatingKitchen) return;
    setCreatingKitchen(true);
    try {
      setName('');
      await kitchenAPI.create(restaurantId, kitchenName);
      setName('');
      await load();
    } catch (error) {
      setName(kitchenName);
      RNAlert.alert('Error', error instanceof Error ? error.message : 'Failed to create kitchen');
    } finally {
      setCreatingKitchen(false);
    }
  };

  const kitchenMembers = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const k of items) map[k.id] = k.memberUserIds || [];
    return map;
  }, [items]);

  const assignedKitchenByMember = useMemo(() => {
    const map: Record<string, number> = {};

    for (const kitchen of items) {
      for (const memberId of kitchen.memberUserIds || []) {
        map[memberId] = kitchen.id;
      }
    }

    return map;
  }, [items]);

  const updateKitchenMembershipLocal = useCallback(
    (kitchenId: number, userId: string, selected: boolean) => {
      setItems((currentItems) =>
        currentItems.map((kitchen) => {
          if (kitchen.id === kitchenId) {
            const memberUserIds = [...(kitchen.memberUserIds || [])];
            const memberIndex = memberUserIds.indexOf(userId);

            if (selected) {
              if (memberIndex >= 0) memberUserIds.splice(memberIndex, 1);
            } else if (memberIndex < 0) {
              memberUserIds.push(userId);
            }

            return {
              ...kitchen,
              memberUserIds,
            };
          }

          if (selected) {
            const memberUserIds = [...(kitchen.memberUserIds || [])];

            for (let index = memberUserIds.length - 1; index >= 0; index -= 1) {
              if (memberUserIds[index] === userId) {
                memberUserIds.splice(index, 1);
              }
            }

            return {
              ...kitchen,
              memberUserIds,
            };
          }

          return kitchen;
        })
      );
    },
    []
  );

  const handleDeleteKitchen = (kitchen: Kitchen) => {
    RNAlert.alert(
      'Delete kitchen?',
      `Are you sure you want to delete "${kitchen.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              removeKitchenLocal(kitchen.id);
              setKitchenBusy(kitchen.id, true);
              await kitchenAPI.remove(restaurantId, kitchen.id);
              await load();
            } catch (error) {
              console.error('Failed to delete kitchen:', error);
              await load();
              RNAlert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete kitchen'
              );
            } finally {
              setKitchenBusy(kitchen.id, false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Kitchen Management',
          headerTitle: 'Create kitchens, assign members',
        }}
      />
      <View className="px-4 py-3">
        <Input value={name} onChangeText={setName} placeholder="Kitchen name" />
        <Button title="Create Kitchen" onPress={create} loading={creatingKitchen} className="mt-2" />
      </View>
      <FlatList data={items} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => (
        <View className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 pr-2 text-base font-semibold text-black" numberOfLines={1}>
              {item.name}
            </Text>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setAssigningKitchenId(assigningKitchenId === item.id ? null : item.id)}
                className={`rounded-lg px-3 py-2 ${assigningKitchenId === item.id ? 'bg-gray-200' : 'bg-red-600'}`}>
                <Text className={`text-xs font-semibold ${assigningKitchenId === item.id ? 'text-red-600' : 'text-white'}`}>
                  Assign Members
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeleteKitchen(item)}
                disabled={busyKitchenIds[item.id]}
                className={`rounded-lg px-3 py-2 active:opacity-70 ${busyKitchenIds[item.id] ? 'bg-red-300' : 'bg-red-600'}`}>
                <Text className="text-xs font-semibold text-white">
                  {busyKitchenIds[item.id] ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>

              <Switch
                checked={item.isActive ?? true}
                disabled={busyKitchenIds[item.id]}
                onCheckedChange={async (v) => {
                  const previousValue = item.isActive ?? true;
                  setKitchenActiveLocal(item.id, v);
                  setKitchenBusy(item.id, true);
                  try {
                    await kitchenAPI.update(restaurantId, item.id, { isActive: v });
                  } catch (error) {
                    setKitchenActiveLocal(item.id, previousValue);
                    RNAlert.alert('Error', error instanceof Error ? error.message : 'Failed to update kitchen');
                  } finally {
                    setKitchenBusy(item.id, false);
                  }
                }}
              />
            </View>
          </View>
          {assigningKitchenId === item.id && (
            <View className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <View className="flex-row items-center border-b border-gray-200 bg-gray-100 px-3 py-2">
                <Text className="flex-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Member
                </Text>
                <Text className="w-24 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </Text>
              </View>

              {members
                .filter((m) => m.roles?.some((r) => r.roleName.toLowerCase() === 'kitchen'))
                .filter((m) => {
                  const assignedKitchenId = assignedKitchenByMember[m.userId];
                  return assignedKitchenId === undefined || assignedKitchenId === item.id;
                })
                .map((m) => {
                const selected = (kitchenMembers[item.id] || []).includes(m.userId);
                const memberActionKey = `${item.id}:${m.userId}`;
                const isBusy = busyMemberKey === memberActionKey;
                let actionLabel = 'Assign';

                if (selected) {
                  actionLabel = 'Remove';
                }

                if (isBusy) {
                  actionLabel = selected ? 'Removing...' : 'Assigning...';
                }

                return (
                  <View
                    key={m.id}
                    className={`flex-row items-center border-b border-gray-200 px-3 py-3 last:border-b-0 ${selected ? 'bg-red-50' : 'bg-white'}`}>
                    <Text className="flex-1 pr-3 text-black" numberOfLines={1}>
                      {m.userName}
                    </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        if (isBusy) return;
                        const nextSelected = !selected;
                        setBusyMemberKey(memberActionKey);
                        updateKitchenMembershipLocal(item.id, m.userId, nextSelected);

                        try {
                          if (selected) {
                            await kitchenAPI.removeMember(restaurantId, item.id, m.userId);
                            RNAlert.alert('Success', 'Member removed from kitchen');
                          } else {
                            await kitchenAPI.addMember(restaurantId, item.id, m.userId);
                            RNAlert.alert('Success', 'Member assigned to kitchen');
                          }
                        } catch (error) {
                          updateKitchenMembershipLocal(item.id, m.userId, selected);
                          RNAlert.alert('Error', error instanceof Error ? error.message : 'Failed to update member');
                        } finally {
                          setBusyMemberKey(null);
                        }
                      }}
                      disabled={isBusy}
                      className={`w-24 rounded-lg px-3 py-2 ${selected ? 'bg-red-600' : 'bg-gray-200'} ${isBusy ? 'opacity-60' : ''}`}>
                      <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-gray-700'}`}>
                        {actionLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )} />
    </View>
  );
}
