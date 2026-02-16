import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { orderAPI, tableAPI, type Order, type Table } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';

export default function WaiterView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tables, setTables] = useState<Table[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        tableAPI.getAll(restaurantId),
        orderAPI.getWaiterOrders(restaurantId),
      ]);
      setTables(tablesRes.data || []);
      setReadyOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleMarkDelivered = async (orderId: number) => {
    try {
      await orderAPI.updateOrderStatus(restaurantId, orderId, 'served');
      fetchData();
    } catch (error) {
      console.error('Delivery update failed:', error);
    }
  };

  const readyCountByTable: Record<number, number> = {};
  readyOrders.forEach((order) => {
    const tn = order.tableNumber || 0;
    readyCountByTable[tn] = (readyCountByTable[tn] || 0) + 1;
  });

  const filteredOrders = selectedTable
    ? readyOrders.filter((o) => o.tableNumber === selectedTable)
    : readyOrders;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Waiter',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-slate-900 px-4 pt-2">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-white">Ready for Delivery</Text>
          <TouchableOpacity
            onPress={fetchData}
            className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="refresh" size={22} color="#F97316" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={tables.sort((a, b) => a.tableNumber - b.tableNumber)}
          numColumns={4}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <Text className="mb-3 text-sm text-slate-400">Tap a table to filter</Text>
          }
          renderItem={({ item: table }) => {
            const count = readyCountByTable[table.tableNumber] || 0;
            const isSelected = selectedTable === table.tableNumber;
            return (
              <TouchableOpacity
                onPress={() => setSelectedTable(isSelected ? null : table.tableNumber)}
                activeOpacity={0.7}
                className="m-[1%] w-[23%]">
                <Card className={isSelected ? 'border border-brand' : ''}>
                  <CardContent className="items-center py-3">
                    <Text className="font-bold text-white">#{table.tableNumber}</Text>
                    {count > 0 && (
                      <Badge variant="success" className="mt-1">
                        {count}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <View className="mt-5">
              <Text className="mb-3 text-lg font-bold text-white">
                {selectedTable ? `Table #${selectedTable} Orders` : 'All Ready Orders'} (
                {filteredOrders.length})
              </Text>
              {filteredOrders.map((order) => (
                <Card key={order.id} className="mb-3">
                  <CardContent>
                    <View className="mb-2 flex-row items-center justify-between">
                      <View>
                        <Text className="text-base font-bold text-white">{order.orderNumber}</Text>
                        <Badge variant="outline" className="mt-1">
                          Table {order.tableNumber}
                        </Badge>
                      </View>
                      <Button
                        title="Delivered"
                        size="sm"
                        variant="success"
                        onPress={() => handleMarkDelivered(order.id)}
                      />
                    </View>
                    {order.items?.map((item, idx) => (
                      <Text key={idx} className="text-sm text-slate-300">
                        {item.quantity}x {item.itemName}
                      </Text>
                    ))}
                  </CardContent>
                </Card>
              ))}
              {filteredOrders.length === 0 && (
                <Text className="py-10 text-center text-slate-500">
                  No orders ready for delivery
                </Text>
              )}
            </View>
          }
        />
      </View>
    </>
  );
}
