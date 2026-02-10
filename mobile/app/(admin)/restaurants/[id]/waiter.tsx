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

  // Count ready orders per table
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
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Waiter View' }} />
      <View className="flex-1 bg-black p-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-xl font-bold">Ready for Delivery</Text>
          <TouchableOpacity onPress={fetchData}>
            <MaterialIcons name="refresh" size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* Table grid */}
        <FlatList
          data={tables.sort((a, b) => a.tableNumber - b.tableNumber)}
          numColumns={4}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View className="mb-3">
              <Text className="text-gray-400 text-sm mb-2">Tap a table to filter</Text>
            </View>
          }
          renderItem={({ item: table }) => {
            const count = readyCountByTable[table.tableNumber] || 0;
            const isSelected = selectedTable === table.tableNumber;
            return (
              <TouchableOpacity
                onPress={() =>
                  setSelectedTable(
                    isSelected ? null : table.tableNumber
                  )
                }
                className="w-[23%] m-[1%]"
              >
                <Card
                  className={isSelected ? 'border-red-600 border-2' : ''}
                >
                  <CardContent className="items-center py-3">
                    <Text className="text-white font-bold">
                      #{table.tableNumber}
                    </Text>
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
            <View className="mt-4">
              <Text className="text-white font-bold text-lg mb-3">
                {selectedTable
                  ? `Table #${selectedTable} Orders`
                  : 'All Ready Orders'}{' '}
                ({filteredOrders.length})
              </Text>
              {filteredOrders.map((order) => (
                <Card key={order.id} className="mb-3">
                  <CardContent>
                    <View className="flex-row justify-between items-center mb-2">
                      <View>
                        <Text className="text-white font-bold text-base">
                          {order.orderNumber}
                        </Text>
                        <Badge variant="outline" className="mt-1">
                          Table {order.tableNumber}
                        </Badge>
                      </View>
                      <Button
                        title="Delivered"
                        onPress={() => handleMarkDelivered(order.id)}
                        className="bg-green-600 px-4 py-2"
                      />
                    </View>
                    {order.items?.map((item, idx) => (
                      <Text key={idx} className="text-gray-300 text-sm">
                        {item.quantity}x {item.itemName}
                      </Text>
                    ))}
                  </CardContent>
                </Card>
              ))}
              {filteredOrders.length === 0 && (
                <Text className="text-gray-500 text-center py-8">
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
