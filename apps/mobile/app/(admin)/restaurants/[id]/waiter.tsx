import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { orderAPI, tableAPI, type Order, type Table } from '@/lib/api';
import { notificationAPI } from '@/lib/api/notification';
import { availabilityAPI } from '@/lib/api/availability';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { useDemoMode } from '@/lib/hooks/useDemoMode';
import { hapticMedium, hapticSuccess, hapticError } from '@/lib/utils/haptics';

export default function WaiterView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(true);

  const restaurantId = Number(id);
  const { isDemoMode } = useDemoMode(restaurantId);

  // Undo delivered: track last delivered order for 5s
  const [undoOrderId, setUndoOrderId] = useState<number | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch function for real-time orders
  const fetchOrdersFn = useCallback(async () => {
    const res = await orderAPI.getWaiterOrders(restaurantId);
    return res.data || [];
  }, [restaurantId]);

  const { orders: readyOrders, loading: ordersLoading, hasNewOrders, refresh, dismissNewOrders } =
    useRealtimeOrders({ fetchFn: fetchOrdersFn, interval: 5000, vibrateOnNew: true });

  // New order alert animation
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

  const fetchTables = useCallback(async () => {
    try {
      const res = await tableAPI.getAll(restaurantId);
      setTables(res.data || []);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    } finally {
      setTablesLoading(false);
    }
  }, [restaurantId]);

  // Check clock-in status
  const checkAvailability = useCallback(async () => {
    try {
      const res = await availabilityAPI.getAvailability(restaurantId);
      const me = (res.data || []).find((s: any) => s.isClockedIn);
      setIsClockedIn(!!me);
    } catch {
      // Availability might not be set up; ignore
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchTables();
    checkAvailability();
  }, [fetchTables, checkAvailability]);

  const handleClockToggle = async () => {
    setClockLoading(true);
    try {
      if (isClockedIn) {
        await availabilityAPI.clockOut(restaurantId);
        setIsClockedIn(false);
      } else {
        await availabilityAPI.clockIn(restaurantId);
        setIsClockedIn(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Clock action failed');
    } finally {
      setClockLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    hapticMedium();
    try {
      await notificationAPI.acceptOrder(restaurantId, orderId);
      hapticSuccess();
      refresh();
    } catch (error: any) {
      hapticError();
      // Handle conflict - order already claimed
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('claimed')) {
        Alert.alert('Already Claimed', 'This order has already been accepted by another waiter.');
      } else {
        Alert.alert('Error', msg || 'Accept order failed');
      }
      refresh();
    }
  };

  const handleMarkDelivered = async (orderId: number) => {
    hapticSuccess();
    try {
      await orderAPI.updateOrderStatus(restaurantId, orderId, 'served');
      // Show undo for 5 seconds
      setUndoOrderId(orderId);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoOrderId(null), 5000);
      refresh();
    } catch (error) {
      console.error('Delivery update failed:', error);
    }
  };

  const handleUndoDelivered = async () => {
    if (!undoOrderId) return;
    hapticMedium();
    try {
      await orderAPI.updateOrderStatus(restaurantId, undoOrderId, 'ready');
      setUndoOrderId(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      refresh();
    } catch (error) {
      console.error('Undo failed:', error);
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

  if (tablesLoading && ordersLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  const alertBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#16A34A', '#4ADE80'],
  });

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
        <DemoModeBanner visible={isDemoMode} />

        {/* Undo delivered toast */}
        {undoOrderId && (
          <TouchableOpacity
            onPress={handleUndoDelivered}
            activeOpacity={0.7}
            className="mb-3 flex-row items-center justify-between rounded-xl bg-slate-700 px-4 py-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="undo" size={18} color="#F59E0B" />
              <Text className="text-sm font-semibold text-amber-400">
                Marked as delivered
              </Text>
            </View>
            <Text className="text-xs font-bold text-amber-400">UNDO</Text>
          </TouchableOpacity>
        )}

        {/* Clock In / Out Toggle */}
        <View className="mb-3 flex-row items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <MaterialIcons
              name={isClockedIn ? 'toggle-on' : 'toggle-off'}
              size={28}
              color={isClockedIn ? '#22C55E' : '#64748B'}
            />
            <Text className={isClockedIn ? 'font-semibold text-green-400' : 'font-semibold text-slate-400'}>
              {isClockedIn ? 'On Shift' : 'Off Shift'}
            </Text>
          </View>
          <Button
            title={clockLoading ? '...' : isClockedIn ? 'Clock Out' : 'Clock In'}
            size="sm"
            variant={isClockedIn ? 'danger' : 'success'}
            onPress={handleClockToggle}
            disabled={clockLoading}
          />
        </View>

        {/* New Order Alert Banner */}
        {hasNewOrders && (
          <Animated.View
            style={{ backgroundColor: alertBg }}
            className="mb-3 flex-row items-center justify-between rounded-xl px-4 py-3">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="notifications-active" size={20} color="#FFF" />
              <Text className="font-bold text-white">New orders ready!</Text>
            </View>
            <TouchableOpacity onPress={dismissNewOrders}>
              <MaterialIcons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        )}

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-white">Ready for Delivery</Text>
          <TouchableOpacity
            onPress={refresh}
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
                      <View className="flex-row items-center gap-2">
                        {!order.acceptedBy && (
                          <TouchableOpacity
                            onPress={() => handleAcceptOrder(order.id)}
                            activeOpacity={0.7}
                            className="h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                            <MaterialIcons name="pan-tool" size={20} color="#FFF" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleMarkDelivered(order.id)}
                          activeOpacity={0.7}
                          className="h-12 w-12 items-center justify-center rounded-xl bg-green-600">
                          <MaterialIcons name="check" size={22} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {order.acceptedBy && (
                      <View className="mb-1 flex-row items-center gap-1">
                        <MaterialIcons name="check-circle" size={12} color="#22C55E" />
                        <Text className="text-xs text-green-400">
                          Accepted{order.acceptedByName ? ` by ${order.acceptedByName}` : ''}
                        </Text>
                      </View>
                    )}
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
