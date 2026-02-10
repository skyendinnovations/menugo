import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { orderAPI, type Order } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

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
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white font-bold text-base">{order.orderNumber}</Text>
            <Badge variant={STATUS_COLORS[order.status] || 'default'}>
              {order.status.toUpperCase()}
            </Badge>
          </View>

          {order.items?.map((item, idx) => (
            <View key={idx} className="flex-row justify-between py-1">
              <Text className="text-gray-300">
                {item.quantity}x {item.itemName}
                {item.variantName ? ` (${item.variantName})` : ''}
              </Text>
              <Text className="text-gray-400">
                ${(parseFloat(item.priceAtOrder) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-red-900">
            <Text className="text-white font-semibold">Total: ${total.toFixed(2)}</Text>
            {nextStatus && (
              <Button
                title={`→ ${nextStatus}`}
                onPress={() => handleStatusUpdate(order.id, nextStatus)}
                className="bg-red-600 px-3 py-1 rounded-lg"
              />
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Orders' }} />
      <View className="flex-1 bg-black">
        <View className="flex-row justify-between items-center p-4">
          <Text className="text-white text-xl font-bold">Orders</Text>
          <TouchableOpacity onPress={fetchOrders}>
            <Text className="text-red-500">Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#dc2626" />
        ) : (
          <Tabs defaultValue="received">
            <TabsList>
              {statuses.map((s) => (
                <TabsTrigger key={s} value={s}>
                  <Text>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                    {` (${orders.filter((o) => o.status === s).length})`}
                  </Text>
                </TabsTrigger>
              ))}
            </TabsList>
            {statuses.map((s) => (
              <TabsContent key={s} value={s}>
                <FlatList
                  data={orders.filter((o) => o.status === s)}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => renderOrder(item)}
                  ListEmptyComponent={
                    <Text className="text-gray-500 text-center py-8">
                      No {s} orders
                    </Text>
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
