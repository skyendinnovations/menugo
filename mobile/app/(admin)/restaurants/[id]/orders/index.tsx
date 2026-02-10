import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { orderAPI, type Order } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { MaterialIcons } from '@expo/vector-icons';

const STATUS_COLORS: Record<string, 'default' | 'destructive' | 'success' | 'outline'> = {
  received: 'default',
  preparing: 'outline',
  ready: 'success',
  served: 'success',
  paid: 'success',
  cancelled: 'destructive',
};

export default function OrdersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderAPI.getOrders(restaurantId);
      setOrders(res.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(useCallback(() => { fetchOrders(); }, [fetchOrders]));

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      await orderAPI.updateOrderStatus(restaurantId, orderId, newStatus);
      fetchOrders();
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const getNextStatus = (current: string): string | null => {
    const transitions: Record<string, string> = {
      received: 'preparing',
      preparing: 'ready',
      ready: 'served',
      served: 'paid',
    };
    return transitions[current] || null;
  };

  const statuses = ['received', 'preparing', 'ready', 'served', 'paid'];

  const renderOrder = (order: Order) => {
    const nextStatus = getNextStatus(order.status);
    const total = order.items?.reduce(
      (sum, item) => sum + parseFloat(item.priceAtOrder) * item.quantity,
      0
    ) ?? 0;

    return (
      <Card className="mb-3">
        <CardContent>
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-bold text-base">{order.orderNumber}</Text>
            <Badge variant={STATUS_COLORS[order.status] || 'default'}>
              {order.status.toUpperCase()}
            </Badge>
          </View>

          {order.items?.map((item, idx) => (
            <View key={idx} className="flex-row justify-between py-1">
              <Text className="text-slate-300 text-sm">
                {item.quantity}x {item.itemName}
                {item.variantName ? ` (${item.variantName})` : ''}
              </Text>
              <Text className="text-slate-400 text-sm">
                ${(parseFloat(item.priceAtOrder) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-700">
            <Text className="text-white font-semibold">Total: ${total.toFixed(2)}</Text>
            {nextStatus && (
              <Button
                title={nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                size="sm"
                onPress={() => handleStatusUpdate(order.id, nextStatus)}
              />
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-5 py-4">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Orders</Text>
          </View>
          <TouchableOpacity
            onPress={fetchOrders}
            className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center"
          >
            <MaterialIcons name="refresh" size={22} color="#F97316" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <Tabs defaultValue="received">
            <TabsList>
              {statuses.map((s) => (
                <TabsTrigger key={s} value={s}>
                  <Text>
                    {s.charAt(0).toUpperCase() + s.slice(1)} ({orders.filter((o) => o.status === s).length})
                  </Text>
                </TabsTrigger>
              ))}
            </TabsList>
            {statuses.map((s) => (
              <TabsContent key={s} value={s}>
                <FlatList
                  data={orders.filter((o) => o.status === s)}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                  renderItem={({ item }) => renderOrder(item)}
                  ListEmptyComponent={
                    <Text className="text-slate-500 text-center py-10">No {s} orders</Text>
                  }
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </View>
    </>
  );
}
