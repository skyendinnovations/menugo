import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { tableAPI, type Table } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MaterialIcons } from '@expo/vector-icons';

export default function TablesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setLoading(true);
          const res = await tableAPI.getAll(restaurantId);
          setTables(res.data || []);
        } catch (error) {
          console.error('Failed to fetch tables:', error);
        } finally {
          setLoading(false);
        }
      })();
    }, [restaurantId])
  );

  const renderTable = ({ item }: { item: Table }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(admin)/restaurants/${id}/tables/${item.id}` as any)}
      activeOpacity={0.7}
      className="m-[1%] w-[31%]">
      <Card>
        <CardContent className="items-center py-5">
          <View
            className="mb-2 h-11 w-11 items-center justify-center rounded-xl"
            style={{
              backgroundColor: item.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
            }}>
            <MaterialIcons
              name="table-restaurant"
              size={24}
              color={item.isActive ? '#22C55E' : '#64748B'}
            />
          </View>
          <Text className="font-bold text-white">#{item.tableNumber}</Text>
          <Text className="mt-0.5 text-xs text-slate-500">Cap: {item.capacity}</Text>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-900 px-4 pt-4">
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">Tables</Text>
          </View>
          <Button
            title="+ Add"
            size="sm"
            onPress={() => router.push(`/(admin)/restaurants/${id}/tables/create` as any)}
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <FlatList
            data={tables.sort((a, b) => a.tableNumber - b.tableNumber)}
            renderItem={renderTable}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </>
  );
}
