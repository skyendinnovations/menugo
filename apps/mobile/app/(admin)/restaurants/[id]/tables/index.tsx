import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { tableAPI, type Table } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

export default function TablesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const numColumns = width < 380 ? 2 : width < 600 ? 3 : 4;
  const cardWidth = (width - 32 - (numColumns - 1) * 8) / numColumns;

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
      onPress={() => router.push(ROUTES.ADMIN.TABLES.detail(restaurantId, item.id) as any)}
      activeOpacity={0.7}
      style={{ width: cardWidth, marginBottom: 8, marginRight: 8 }}>
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
          <Text className="font-bold text-black">#{item.tableNumber}</Text>
          <Text className="mt-0.5 text-xs text-gray-500">Cap: {item.capacity}</Text>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Tables' }} />
      <View className="flex-1 bg-white px-4">
        <View className="mb-4 flex-row justify-end">
          <Button
            title="+ Add"
            size="sm"
            onPress={() => router.push(ROUTES.ADMIN.TABLES.create(restaurantId) as any)}
          />
        </View>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        ) : (
          <FlatList
            key={numColumns}
            data={[...tables].sort((a, b) => a.tableNumber - b.tableNumber)}
            renderItem={renderTable}
            keyExtractor={(item) => String(item.id)}
            numColumns={numColumns}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            columnWrapperStyle={{ justifyContent: 'flex-start' }}
          />
        )}
      </View>
    </>
  );
}
