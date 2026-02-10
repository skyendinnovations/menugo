import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
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
      onPress={() =>
        router.push(`/(admin)/restaurants/${id}/tables/${item.id}` as any)
      }
      className="w-[31%] m-[1%]"
    >
      <Card>
        <CardContent className="items-center py-4">
          <MaterialIcons name="table-restaurant" size={28} color={item.isActive ? '#22c55e' : '#6b7280'} />
          <Text className="text-white font-bold mt-2">#{item.tableNumber}</Text>
          <Text className="text-gray-400 text-xs">Cap: {item.capacity}</Text>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-black p-4">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Tables</Text>
          </View>
          <Button
            title="+ Add"
            onPress={() =>
              router.push(`/(admin)/restaurants/${id}/tables/create` as any)
            }
            className="bg-red-600 rounded-lg px-4 py-2"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#dc2626" />
        ) : (
          <FlatList
            data={tables.sort((a, b) => a.tableNumber - b.tableNumber)}
            renderItem={renderTable}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}
