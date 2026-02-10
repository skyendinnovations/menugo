import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { orderAPI, type Order } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';

const COLUMNS = ['received', 'preparing', 'ready'] as const;

const COLUMN_COLORS: Record<string, string> = {
  received: '#f59e0b',
  preparing: '#f97316',
  ready: '#22c55e',
};

function getElapsedMinutes(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function getUrgencyColor(minutes: number): string {
  if (minutes < 5) return '#22c55e';
  if (minutes < 15) return '#f59e0b';
  return '#ef4444';
}

export default function KitchenView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await orderAPI.getKitchenOrders(restaurantId);
      setOrders(res.data || []);
    } catch (error) {
      console.error('Failed to fetch kitchen orders:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleAdvanceStatus = async (orderId: number, currentStatus: string) => {
    const nextMap: Record<string, string> = {
      received: 'preparing',
      preparing: 'ready',
      ready: 'served',
    };
    const next = nextMap[currentStatus];
    if (!next) return;

    try {
      await orderAPI.updateOrderStatus(restaurantId, orderId, next);
      fetchOrders();
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const renderOrderCard = (order: Order) => {
    const elapsed = getElapsedMinutes(order.createdAt);
    const urgencyColor = getUrgencyColor(elapsed);

    return (
      <TouchableOpacity
        key={order.id}
        onPress={() => handleAdvanceStatus(order.id, order.status)}
        className="mb-3"
      >
        <Card>
          <CardContent className="p-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-white font-bold text-lg">{order.orderNumber}</Text>
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="access-time" size={16} color={urgencyColor} />
                <Text style={{ color: urgencyColor }} className="font-bold">
                  {elapsed}m
                </Text>
              </View>
            </View>

            {order.tableNumber && (
              <Badge variant="outline" className="mb-2">
                Table {order.tableNumber}
              </Badge>
            )}

            {order.items?.map((item, idx) => (
              <View key={idx} className="py-1">
                <Text className="text-white text-base font-semibold">
                  {item.quantity}x {item.itemName}
                </Text>
                {item.variantName && (
                  <Text className="text-gray-400 text-sm ml-4">
                    {item.variantName}
                  </Text>
                )}
                {item.notes && (
                  <Text className="text-yellow-400 text-sm ml-4">
                    Note: {item.notes}
                  </Text>
                )}
              </View>
            ))}

            <View className="mt-2 pt-2 border-t border-red-900/50">
              <Text className="text-gray-400 text-xs text-center">
                Tap to advance status
              </Text>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Kitchen' }} />
      <View className="flex-1 bg-black">
        <View className="flex-row justify-between items-center p-3">
          <Text className="text-white text-xl font-bold">Kitchen View</Text>
          <TouchableOpacity onPress={fetchOrders}>
            <MaterialIcons name="refresh" size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row px-2">
            {COLUMNS.map((col) => {
              const colOrders = orders.filter((o) => o.status === col);
              return (
                <View key={col} className="w-80 mx-1">
                  <View
                    className="rounded-t-lg p-3 items-center"
                    style={{ backgroundColor: COLUMN_COLORS[col] + '30' }}
                  >
                    <Text
                      className="font-bold text-base uppercase"
                      style={{ color: COLUMN_COLORS[col] }}
                    >
                      {col} ({colOrders.length})
                    </Text>
                  </View>
                  <ScrollView className="flex-1 p-2">
                    {colOrders.map(renderOrderCard)}
                    {colOrders.length === 0 && (
                      <Text className="text-gray-600 text-center py-8">
                        No orders
                      </Text>
                    )}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
