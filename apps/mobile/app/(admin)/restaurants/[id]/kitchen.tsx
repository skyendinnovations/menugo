import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { orderAPI, type Order } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';

const COLUMNS = ['received', 'preparing', 'ready'] as const;

const COLUMN_COLORS: Record<string, string> = {
  received: '#F59E0B',
  preparing: '#F97316',
  ready: '#22C55E',
};

function getElapsedMinutes(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function getUrgencyColor(minutes: number): string {
  if (minutes < 5) return '#22C55E';
  if (minutes < 15) return '#F59E0B';
  return '#EF4444';
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
    const interval = setInterval(fetchOrders, 10000);
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
        activeOpacity={0.7}
        className="mb-3">
        <Card>
          <CardContent className="p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">{order.orderNumber}</Text>
              <View className="flex-row items-center gap-2 rounded-full bg-slate-700 px-3 py-1">
                <MaterialIcons name="access-time" size={14} color={urgencyColor} />
                <Text style={{ color: urgencyColor }} className="text-sm font-bold">
                  {elapsed}m
                </Text>
              </View>
            </View>

            {order.tableNumber && (
              <Badge variant="outline" className="mb-3">
                Table {order.tableNumber}
              </Badge>
            )}

            {order.items?.map((item, idx) => (
              <View key={idx} className="py-1">
                <Text className="text-base font-semibold text-white">
                  {item.quantity}x {item.itemName}
                </Text>
                {item.variantName && (
                  <Text className="ml-4 text-sm text-slate-400">{item.variantName}</Text>
                )}
                {item.notes && (
                  <Text className="ml-4 text-sm text-amber-400">Note: {item.notes}</Text>
                )}
              </View>
            ))}

            <View className="mt-3 border-t border-slate-700 pt-3">
              <Text className="text-center text-xs text-slate-500">Tap to advance status</Text>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

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
          title: 'Kitchen',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-slate-900">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-xl font-bold text-white">Kitchen View</Text>
          <TouchableOpacity
            onPress={fetchOrders}
            className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="refresh" size={22} color="#F97316" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row px-2">
            {COLUMNS.map((col) => {
              const colOrders = orders.filter((o) => o.status === col);
              return (
                <View key={col} className="mx-1.5 w-80">
                  <View
                    className="mb-2 items-center rounded-xl p-3"
                    style={{ backgroundColor: COLUMN_COLORS[col] + '18' }}>
                    <Text
                      className="text-sm font-bold uppercase"
                      style={{ color: COLUMN_COLORS[col] }}>
                      {col} ({colOrders.length})
                    </Text>
                  </View>
                  <ScrollView className="flex-1">
                    {colOrders.map(renderOrderCard)}
                    {colOrders.length === 0 && (
                      <Text className="py-10 text-center text-slate-600">No orders</Text>
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
