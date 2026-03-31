import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { orderAPI } from '@/lib/api/order';
import type { Order, OrderItem } from '@menugo/dto';
import { useAuth } from '@/lib/hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Item Row for Waiter ───────────────────────────────────────────────────────

interface WaiterItemRowProps {
  item: OrderItem;
  order: Order;
  restaurantId: number;
  currentUserId?: string;
  onRefresh: () => void;
}

function WaiterItemRow({
  item,
  order,
  restaurantId,
  currentUserId,
  onRefresh,
}: WaiterItemRowProps) {
  const [loading, setLoading] = useState(false);
  const isMyClaim = item.acceptedByWaiter === currentUserId;
  const isClaimed = !!item.acceptedByWaiter;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await orderAPI.acceptOrderItem(restaurantId, order.id, item.id, 'waiter');
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not accept item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async () => {
    setLoading(true);
    try {
      await orderAPI.updateItemStatus(restaurantId, order.id, item.id, 'served');
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not mark as delivered');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="mb-2 flex-row items-center gap-3 rounded-xl bg-slate-800 p-3">
      {/* Item info */}
      <View className="flex-1">
        <Text className="text-base font-bold text-white">
          {item.quantity}× {item.itemName}
        </Text>
        {item.variantName && <Text className="text-sm text-slate-400">{item.variantName}</Text>}
        {item.notes && <Text className="mt-0.5 text-xs text-amber-400">📝 {item.notes}</Text>}
        {isClaimed && (
          <View className="mt-1 flex-row items-center gap-1">
            <MaterialIcons name="check-circle" size={12} color="#22C55E" />
            <Text className="text-xs text-green-400" numberOfLines={1}>
              {isMyClaim
                ? 'You claimed this'
                : `Claimed by ${item.acceptedByWaiterName || 'another waiter'}`}
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View className="gap-2">
        {!isClaimed && (
          <TouchableOpacity
            onPress={handleAccept}
            disabled={loading}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 rounded-lg bg-blue-600 px-3 py-2">
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="pan-tool" size={14} color="#fff" />
                <Text className="text-sm font-bold text-white">Take</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {(isMyClaim || !isClaimed) && (
          <TouchableOpacity
            onPress={handleDeliver}
            disabled={loading}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 rounded-lg bg-green-600 px-3 py-2">
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="done-all" size={14} color="#fff" />
                <Text className="text-sm font-bold text-white">Served</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Order Card for Waiter ─────────────────────────────────────────────────────

interface WaiterOrderCardProps {
  order: Order;
  restaurantId: number;
  currentUserId?: string;
  onRefresh: () => void;
}

function WaiterOrderCard({ order, restaurantId, currentUserId, onRefresh }: WaiterOrderCardProps) {
  const readyItems = (order.items || []).filter((i) => i.status === 'ready');
  if (readyItems.length === 0) return null;

  return (
    <View className="bg-slate-850 mb-4 overflow-hidden rounded-2xl border border-slate-700">
      <View className="flex-row items-center justify-between bg-slate-700 px-4 py-3">
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="receipt" size={16} color="#22C55E" />
          <Text className="text-base font-bold text-white">{order.orderNumber}</Text>
        </View>
        {order.tableNumber && (
          <View className="flex-row items-center gap-1 rounded-full border border-green-600/30 bg-green-600/20 px-2 py-0.5">
            <MaterialIcons name="table-restaurant" size={12} color="#22C55E" />
            <Text className="text-xs font-semibold text-green-400">Table {order.tableNumber}</Text>
          </View>
        )}
      </View>

      <View className="p-3">
        {readyItems.map((item) => (
          <WaiterItemRow
            key={item.id}
            item={item}
            order={order}
            restaurantId={restaurantId}
            currentUserId={currentUserId}
            onRefresh={onRefresh}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Waiter View ──────────────────────────────────────────────────────────

export default function WaiterView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const restaurantId = Number(id);
  const { data: authData } = useAuth();
  const currentUserId = authData?.user?.id;

  const fetchData = useCallback(async () => {
    try {
      const ordersRes = await orderAPI.getWaiterOrders(restaurantId);
      const fetchedOrders: Order[] = ordersRes.data || [];
      setOrders(fetchedOrders);

      // Derive unique table numbers from orders (no separate tableAPI needed)
      const tableNums = [...new Set(fetchedOrders.map((o) => o.tableNumber).filter(Boolean))];
      setTables(tableNums.map((n) => ({ tableNumber: n })));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Count ready items per table number
  const readyItemsByTable: Record<number, number> = {};
  orders.forEach((order) => {
    const tn = order.tableNumber || 0;
    const readyCount = (order.items || []).filter((i) => i.status === 'ready').length;
    if (readyCount > 0) {
      readyItemsByTable[tn] = (readyItemsByTable[tn] || 0) + readyCount;
    }
  });

  const filteredOrders = selectedTable
    ? orders.filter((o) => o.tableNumber === selectedTable)
    : orders;

  const totalReadyItems = Object.values(readyItemsByTable).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#22C55E" />
        <Text className="mt-3 text-slate-400">Loading orders…</Text>
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
      <View className="flex-1 bg-slate-900 px-4 pt-3">
        {/* Header */}
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-white">Ready for Delivery</Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {totalReadyItems} item{totalReadyItems !== 1 ? 's' : ''} waiting
            </Text>
          </View>
          <TouchableOpacity
            onPress={fetchData}
            className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="refresh" size={22} color="#22C55E" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          ListHeaderComponent={
            <View>
              {/* Table filter chips */}
              <Text className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                Filter by table
              </Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={tables.sort((a, b) => a.tableNumber - b.tableNumber)}
                keyExtractor={(t) => String(t.id)}
                className="mb-4"
                renderItem={({ item: table }) => {
                  const count = readyItemsByTable[table.tableNumber] || 0;
                  const isSelected = selectedTable === table.tableNumber;
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedTable(isSelected ? null : table.tableNumber)}
                      activeOpacity={0.7}
                      className={`mr-2 min-w-[64px] items-center rounded-xl border px-4 py-3 ${
                        isSelected
                          ? 'border-green-500 bg-green-600'
                          : count > 0
                            ? 'border-green-600/40 bg-slate-800'
                            : 'border-slate-700 bg-slate-800'
                      }`}>
                      <Text
                        className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        #{table.tableNumber}
                      </Text>
                      {count > 0 && (
                        <View
                          className={`mt-1 rounded-full px-1.5 py-0.5 ${isSelected ? 'bg-white/20' : 'bg-green-600'}`}>
                          <Text className="text-[10px] font-bold text-white">{count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Orders list */}
              <Text className="mb-3 text-base font-bold text-white">
                {selectedTable ? `Table #${selectedTable} —` : 'All'} {filteredOrders.length} order
                {filteredOrders.length !== 1 ? 's' : ''}
              </Text>

              {filteredOrders.map((order) => (
                <WaiterOrderCard
                  key={order.id}
                  order={order}
                  restaurantId={restaurantId}
                  currentUserId={currentUserId}
                  onRefresh={fetchData}
                />
              ))}

              {filteredOrders.length === 0 && (
                <View className="items-center py-16">
                  <MaterialIcons name="check-circle-outline" size={56} color="#1E293B" />
                  <Text className="mt-4 text-base font-semibold text-slate-600">
                    All delivered!
                  </Text>
                  <Text className="mt-1 text-sm text-slate-700">No items waiting for pickup</Text>
                </View>
              )}
            </View>
          }
        />
      </View>
    </>
  );
}
