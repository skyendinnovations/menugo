import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useCallback, useRef, useEffect } from 'react';
import { orderAPI, type Order } from '@/lib/api';
import { notificationAPI } from '@/lib/api/notification';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { useDemoMode } from '@/lib/hooks/useDemoMode';
import { hapticMedium, hapticSuccess } from '@/lib/utils/haptics';

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
  const restaurantId = Number(id);
  const { isDemoMode } = useDemoMode(restaurantId);

  const fetchFn = useCallback(async () => {
    const res = await orderAPI.getKitchenOrders(restaurantId);
    return res.data || [];
  }, [restaurantId]);

  const { orders, loading, hasNewOrders, refresh, dismissNewOrders } =
    useRealtimeOrders({ fetchFn, interval: 5000, vibrateOnNew: true });

  // Animated flash for new order alert
  const flashAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (hasNewOrders) {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]).start();
    }
  }, [hasNewOrders]);

  const handleAcceptOrder = async (orderId: number) => {
    hapticMedium();
    try {
      await notificationAPI.acceptOrder(restaurantId, orderId);
      refresh();
    } catch (error) {
      console.error('Accept order failed:', error);
    }
  };

  const handleAdvanceStatus = async (orderId: number, currentStatus: string) => {
    const nextMap: Record<string, string> = {
      received: 'preparing',
      preparing: 'ready',
      ready: 'served',
    };
    const next = nextMap[currentStatus];
    if (!next) return;
    hapticSuccess();
    try {
      await orderAPI.updateOrderStatus(restaurantId, orderId, next);
      refresh();
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

            {order.status === 'received' && !order.acceptedBy && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleAcceptOrder(order.id);
                }}
                activeOpacity={0.7}
                className="mt-3 flex-row items-center justify-center gap-2 rounded-lg bg-green-600 py-3">
                <MaterialIcons name="check" size={20} color="#FFF" />
                <Text className="text-sm font-bold text-white">Accept</Text>
              </TouchableOpacity>
            )}

            {order.acceptedBy && (
              <View className="mt-2 flex-row items-center gap-1.5">
                <MaterialIcons name="check-circle" size={14} color="#22C55E" />
                <Text className="text-xs text-green-400">
                  Accepted{order.acceptedByName ? ` by ${order.acceptedByName}` : ''}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => handleAdvanceStatus(order.id, order.status)}
              activeOpacity={0.7}
              className="mt-3 flex-row items-center justify-center gap-2 rounded-lg border border-slate-600 py-3">
              <MaterialIcons name="arrow-forward" size={18} color="#F97316" />
              <Text className="text-xs font-bold text-brand">Advance Status</Text>
            </TouchableOpacity>
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
        <DemoModeBanner visible={isDemoMode} />

        {/* New order alert banner */}
        {hasNewOrders && (
          <Animated.View
            style={{
              backgroundColor: flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(34,197,94,0.0)', 'rgba(34,197,94,0.3)'],
              }),
            }}
            className="flex-row items-center justify-center px-4 py-2.5">
            <MaterialIcons name="notifications-active" size={18} color="#22C55E" />
            <Text className="ml-2 text-sm font-bold text-green-400">
              New order received!
            </Text>
            <TouchableOpacity onPress={dismissNewOrders} className="ml-3">
              <MaterialIcons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          </Animated.View>
        )}

        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-xl font-bold text-white">Kitchen View</Text>
          <TouchableOpacity
            onPress={refresh}
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
