import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { orderAPI } from '@/lib/api/order';
import type { Order, OrderItem } from '@menugo/dto';
import { useAuth } from '@/lib/hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getElapsedMinutes(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function getUrgencyColor(minutes: number): string {
  if (minutes < 5) return '#22C55E';
  if (minutes < 15) return '#F59E0B';
  return '#EF4444';
}

const STATUS_COLORS: Record<string, string> = {
  received: '#F59E0B',
  preparing: '#F97316',
  ready: '#22C55E',
};

const STATUS_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  received: 'hourglass-empty',
  preparing: 'local-fire-department',
  ready: 'check-circle',
};

const NEXT_STATUS: Record<string, string> = {
  received: 'preparing',
  preparing: 'ready',
};

const NEXT_LABEL: Record<string, string> = {
  received: '🔥 Start Cooking',
  preparing: '✅ Mark Ready',
};

// ─── Item Card ─────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: OrderItem;
  order: Order;
  restaurantId: number;
  currentUserId?: string;
  onRefresh: () => void;
}

function ItemCard({ item, order, restaurantId, currentUserId, onRefresh }: ItemCardProps) {
  const [loading, setLoading] = useState(false);
  const elapsedMinutes = getElapsedMinutes(order.createdAt);
  const urgencyColor = getUrgencyColor(elapsedMinutes);
  const statusColor = STATUS_COLORS[item.status || 'received'] || '#94A3B8';
  const nextStatus = NEXT_STATUS[item.status || 'received'];
  const nextLabel = NEXT_LABEL[item.status || 'received'];
  const isMyItem = item.acceptedByKitchen === currentUserId;
  const isClaimed = !!item.acceptedByKitchen;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await orderAPI.acceptOrderItem(restaurantId, order.id, item.id, 'kitchen');
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not accept item');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setLoading(true);
    try {
      await orderAPI.updateItemStatus(restaurantId, order.id, item.id, nextStatus);
      onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{ borderLeftColor: statusColor, borderLeftWidth: 4 }}
      className="mb-3 overflow-hidden rounded-xl bg-slate-800">
      {/* Item header */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <View className="mr-3 flex-1">
          <Text className="text-lg font-bold text-white">
            {item.quantity}× {item.itemName}
          </Text>
          {item.variantName && (
            <Text className="mt-0.5 text-sm text-slate-400">{item.variantName}</Text>
          )}
          {item.notes && (
            <View className="mt-1 flex-row items-center gap-1">
              <MaterialIcons name="sticky-note-2" size={13} color="#FBBF24" />
              <Text className="flex-1 text-sm text-amber-400">{item.notes}</Text>
            </View>
          )}
        </View>

        {/* Timer + Status dot */}
        <View className="items-end gap-2">
          <View className="flex-row items-center gap-1 rounded-full bg-slate-700 px-2 py-1">
            <MaterialIcons name="access-time" size={12} color={urgencyColor} />
            <Text style={{ color: urgencyColor }} className="text-xs font-bold">
              {elapsedMinutes}m
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <MaterialIcons
              name={STATUS_ICONS[item.status || 'received']}
              size={16}
              color={statusColor}
            />
            <Text style={{ color: statusColor }} className="text-xs font-semibold capitalize">
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Acceptance row */}
      <View className="flex-row items-center justify-between gap-2 px-4 pb-4">
        {!isClaimed ? (
          /* ── UNCLAIMED: show big accept button ── */
          <TouchableOpacity
            onPress={handleAccept}
            disabled={loading}
            activeOpacity={0.7}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-green-600 py-3">
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="pan-tool" size={18} color="#fff" />
                <Text className="text-base font-bold text-white">Accept This Dish</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isMyItem && nextStatus ? (
          /* ── MY ITEM: show advance button ── */
          <TouchableOpacity
            onPress={handleAdvance}
            disabled={loading}
            activeOpacity={0.7}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-orange-500 py-3">
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">{nextLabel}</Text>
            )}
          </TouchableOpacity>
        ) : (
          /* ── CLAIMED BY SOMEONE ELSE ── */
          <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-slate-700 px-3 py-3">
            <MaterialIcons name="check-circle" size={16} color="#22C55E" />
            <Text className="flex-1 text-sm text-green-400" numberOfLines={1}>
              {isClaimed ? `Claimed by ${item.acceptedByKitchenName || 'another chef'}` : 'Ready'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Order Group ───────────────────────────────────────────────────────────────

interface OrderGroupProps {
  order: Order;
  restaurantId: number;
  currentUserId?: string;
  onRefresh: () => void;
  columnStatus: string;
}

function OrderGroup({
  order,
  restaurantId,
  currentUserId,
  onRefresh,
  columnStatus,
}: OrderGroupProps) {
  const columnItems = (order.items || []).filter((i) => i.status === columnStatus);
  if (columnItems.length === 0) return null;

  return (
    <View className="bg-slate-850 mb-4 overflow-hidden rounded-2xl border border-slate-700">
      {/* Order header */}
      <View className="flex-row items-center justify-between bg-slate-700 px-4 py-3">
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="receipt" size={16} color="#F97316" />
          <Text className="text-base font-bold text-white">{order.orderNumber}</Text>
        </View>
        {order.tableNumber && (
          <View className="flex-row items-center gap-1 rounded-full bg-slate-600 px-2 py-0.5">
            <MaterialIcons name="table-restaurant" size={12} color="#94A3B8" />
            <Text className="text-xs text-slate-300">Table {order.tableNumber}</Text>
          </View>
        )}
      </View>

      <View className="p-3">
        {columnItems.map((item) => (
          <ItemCard
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

// ─── Main Kitchen View ─────────────────────────────────────────────────────────

const COLUMNS = ['received', 'preparing', 'ready'] as const;

const COLUMN_META = {
  received: { label: '⏳ Incoming', color: '#F59E0B', bg: '#F59E0B18' },
  preparing: { label: '🔥 Cooking', color: '#F97316', bg: '#F9731618' },
  ready: { label: '✅ Ready', color: '#22C55E', bg: '#22C55E18' },
};

export default function KitchenView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const restaurantId = Number(id);

  const { data: authData } = useAuth();
  const currentUserId = authData?.user?.id;

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
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Count items per column (not orders)
  const itemCountByColumn: Record<string, number> = { received: 0, preparing: 0, ready: 0 };
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const s = item.status || 'received';
      if (s in itemCountByColumn) itemCountByColumn[s]++;
    });
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-3 text-slate-400">Loading kitchen orders…</Text>
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
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-slate-800 px-4 py-3">
          <View>
            <Text className="text-xl font-bold text-white">Kitchen View</Text>
            <Text className="mt-0.5 text-xs text-slate-500">Tap dishes to claim and advance</Text>
          </View>
          <TouchableOpacity
            onPress={fetchOrders}
            className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="refresh" size={22} color="#F97316" />
          </TouchableOpacity>
        </View>

        {/* Kanban Columns (horizontal scroll) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row px-2 pt-3">
            {COLUMNS.map((col) => {
              const meta = COLUMN_META[col];
              const count = itemCountByColumn[col] || 0;

              return (
                <View key={col} className="mx-1.5 w-80">
                  {/* Column header */}
                  <View
                    className="mb-3 flex-row items-center justify-between rounded-xl px-4 py-3"
                    style={{ backgroundColor: meta.bg }}>
                    <Text className="text-base font-bold" style={{ color: meta.color }}>
                      {meta.label}
                    </Text>
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: meta.color }}>
                      <Text className="text-xs font-bold text-white">{count}</Text>
                    </View>
                  </View>

                  {/* Orders in this column */}
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {orders
                      .filter((o) => (o.items || []).some((i) => i.status === col))
                      .map((order) => (
                        <OrderGroup
                          key={`${order.id}-${col}`}
                          order={order}
                          restaurantId={restaurantId}
                          currentUserId={currentUserId}
                          onRefresh={fetchOrders}
                          columnStatus={col}
                        />
                      ))}
                    {count === 0 && (
                      <View className="items-center py-12">
                        <MaterialIcons name="check" size={32} color="#334155" />
                        <Text className="mt-2 text-sm text-slate-600">All clear</Text>
                      </View>
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
