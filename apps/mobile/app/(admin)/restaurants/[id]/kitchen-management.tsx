import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert as RNAlert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { AdminPageHeader } from '@/components/AdminPageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { kitchenAPI, memberAPI, type Kitchen, type Member } from '@/lib/api';

export default function KitchenManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = Number(id);
  const [name, setName] = useState('');
  const [items, setItems] = useState<Kitchen[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assigningKitchenId, setAssigningKitchenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [kRes, mRes] = await Promise.all([kitchenAPI.list(restaurantId), memberAPI.getMembers(restaurantId)]);
    setItems(kRes.data || []);
    setMembers(mRes.data || []);
  }, [restaurantId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    if (!name.trim()) return;
    try {
      await kitchenAPI.create(restaurantId, name.trim());
      setName('');
      await load();
    } catch (error) {
      RNAlert.alert('Error', error instanceof Error ? error.message : 'Failed to create kitchen');
    }
  };

  const kitchenMembers = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const k of items) map[k.id] = k.memberUserIds || [];
    return map;
  }, [items]);

  return (
    <View className="flex-1 bg-slate-900">
      <AdminPageHeader title="Kitchen Management" subtitle="Create kitchens, assign members" restaurantId={restaurantId} />
      <View className="px-4 py-3">
        <Input value={name} onChangeText={setName} placeholder="Kitchen name" />
        <Button title="Create Kitchen" onPress={create} className="mt-2" />
      </View>
      <FlatList data={items} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => (
        <View className="mb-3 rounded-xl border border-slate-700 bg-slate-800 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-semibold">{item.name}</Text>
            <Switch checked={item.isActive ?? true} onCheckedChange={async (v) => {
              try {
                await kitchenAPI.update(restaurantId, item.id, { isActive: v });
                await load();
              } catch (error) {
                RNAlert.alert('Error', error instanceof Error ? error.message : 'Failed to update kitchen');
              }
            }} />
          </View>
          <TouchableOpacity onPress={() => setAssigningKitchenId(assigningKitchenId === item.id ? null : item.id)} className="mt-2 rounded-lg bg-slate-700 px-3 py-2"><Text className="text-center text-white">Assign Members</Text></TouchableOpacity>
          {assigningKitchenId === item.id && (
            <View className="mt-2 gap-2">
              {members.map((m) => {
                const selected = (kitchenMembers[item.id] || []).includes(m.userId);
                return (
                  <TouchableOpacity key={m.id} onPress={async () => {
                    try {
                      if (selected) {
                        await kitchenAPI.removeMember(restaurantId, item.id, m.userId);
                      } else {
                        await kitchenAPI.addMember(restaurantId, item.id, m.userId);
                      }
                      await load();
                    } catch (error) {
                      RNAlert.alert('Error', error instanceof Error ? error.message : 'Failed to update member');
                    }
                  }} className={`rounded-lg px-3 py-2 ${selected ? 'bg-green-700' : 'bg-slate-700'}`}>
                    <Text className="text-white">{m.userName} {selected ? '✓' : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <TouchableOpacity onPress={() => RNAlert.alert('Delete kitchen?', item.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await kitchenAPI.remove(restaurantId, item.id);
              await load();
            } catch (error) {
              RNAlert.alert('Error', error instanceof Error ? error.message : 'Failed to delete kitchen');
            }
          } }])} className="mt-3 rounded-lg bg-red-600 px-3 py-2">
            <Text className="text-center font-semibold text-white">Delete</Text>
          </TouchableOpacity>
        </View>
      )} />
    </View>
  );
}
