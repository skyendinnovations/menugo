import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { orderAPI, type Order } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { formatPrice } from '@menugo/dto';
import { restaurantAPI } from '@/lib/api';
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
  const [currency, setCurrency] = useState('INR');

  const restaurantId = Number(id);

  // Fetch restaurant currency
  useEffect(() => {
    (async () => {
      try {
        const res = await restaurantAPI.getById(restaurantId);
        setCurrency(res.data.currency || 'INR');
      } catch {}
    })();
  }, [restaurantId]);

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

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

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
    const total =
      order.items?.reduce((sum, item) => sum + parseFloat(item.priceAtOrder) * item.quantity, 0) ??
      0;

    return (
      <Card className="mb-3">
        <CardContent>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-white">{order.orderNumber}</Text>
            <Badge variant={STATUS_COLORS[order.status] || 'default'}>
              {order.status.toUpperCase()}
            </Badge>
          </View>

          {order.items?.map((item, idx) => (
            <View key={idx} className="flex-row justify-between py-1">
              <Text className="text-sm text-slate-300">
                {item.quantity}x {item.itemName}
                {item.variantName ? ` (${item.variantName})` : ''}
              </Text>
              <Text className="text-sm text-slate-400">
                {formatPrice(parseFloat(item.priceAtOrder) * item.quantity, currency)}
              </Text>
            </View>
          ))}

          <View className="mt-3 flex-row items-center justify-between border-t border-slate-700 pt-3">
            <Text className="font-semibold text-white">Total: {formatPrice(total, currency)}</Text>
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
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">Orders</Text>
          </View>
          <TouchableOpacity
            onPress={fetchOrders}
            className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="refresh" size={22} color="#F97316" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <Tabs defaultValue="received">
            <TabsList>
              {statuses.map((s) => (
                <TabsTrigger key={s} value={s}>
                  <Text>
                    {s.charAt(0).toUpperCase() + s.slice(1)} (
                    {orders.filter((o) => o.status === s).length})
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
                    <Text className="py-10 text-center text-slate-500">No {s} orders</Text>
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
