import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { orderAPI } from '@/lib/api/order';
import type { Order, OrderItem } from '@menugo/dto';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { MaterialIcons } from '@expo/vector-icons';
import { AdminPageHeader } from '@/components/AdminPageHeader';

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

// ─── New Order Tab — Active Sessions List ──────────────────────────────────────

interface ActiveSessionRowProps {
  session: any; // { session: {...}, tableNumber: number }
  restaurantId: number;
  onPress: () => void;
}

function ActiveSessionRow({ session, restaurantId, onPress }: ActiveSessionRowProps) {
  const tableNumber = session.tableNumber ?? session.session?.tableNumber;
  const personsCount = session.session?.personsCount ?? session.personsCount ?? '—';
  const customerName = session.session?.customerName ?? session.customerName;
  const joinCode = session.session?.joinCode ?? session.joinCode;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="mb-3 flex-row items-center justify-between rounded-2xl border border-slate-700 bg-slate-800 px-4 py-4">
      {/* Table icon */}
      <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15">
        <MaterialIcons name="table-restaurant" size={24} color="#06B6D4" />
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="text-base font-bold text-white">Table #{tableNumber}</Text>
        {customerName ? (
          <Text className="text-sm text-cyan-400" numberOfLines={1}>
            {customerName}
          </Text>
        ) : null}
        <View className="mt-1 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <MaterialIcons name="people" size={12} color="#64748B" />
            <Text className="text-xs text-slate-500">{personsCount} person{personsCount !== 1 ? 's' : ''}</Text>
          </View>
          {joinCode ? (
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="pin" size={12} color="#64748B" />
              <Text className="text-xs text-slate-500">Code: {joinCode}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Arrow */}
      <View className="ml-2 flex-row items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2">
        <MaterialIcons name="add-shopping-cart" size={14} color="#fff" />
        <Text className="text-sm font-bold text-white">Order</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Waiter View ──────────────────────────────────────────────────────────

type Tab = 'deliver' | 'new-order';

export default function WaiterView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('deliver');

  // Deliver tab state
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // New-order tab state
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const restaurantId = Number(id);
  const { data: authData } = useAuth();
  const currentUserId = authData?.user?.id;
  const { hasPermission } = usePermissions(restaurantId);
  const canCreateOrders = hasPermission('create_orders');

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, sessionsRes] = await Promise.all([
        orderAPI.getWaiterOrders(restaurantId),
        canCreateOrders ? orderAPI.getSessions(restaurantId, true) : Promise.resolve({ data: [] }),
      ]);

      const fetchedOrders: Order[] = ordersRes.data || [];
      setOrders(fetchedOrders);

      // Derive unique table numbers from orders
      const tableNums = [...new Set(fetchedOrders.map((o) => o.tableNumber).filter(Boolean))];
      setTables(tableNums.map((n) => ({ tableNumber: n })));

      // Active sessions for "New Order" tab
      setActiveSessions(sessionsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, canCreateOrders]);

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

  const handleNewOrder = (session: any) => {
    const sessionData = session.session || session;
    const tableId = sessionData.tableId;
    const sessionId = sessionData.id;
    if (!tableId || !sessionId) {
      Alert.alert('Error', 'Could not resolve session details.');
      return;
    }
    router.push(
      `/restaurants/${id}/tables/${tableId}/add-order?sessionId=${sessionId}` as any
    );
  };

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
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-900">
        <AdminPageHeader
          title="Waiter"
          subtitle={
            activeTab === 'deliver'
              ? `${totalReadyItems} item${totalReadyItems !== 1 ? 's' : ''} ready for delivery`
              : `${activeSessions.length} active table${activeSessions.length !== 1 ? 's' : ''}`
          }
          restaurantId={restaurantId}
          right={
            <TouchableOpacity
              onPress={fetchData}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="refresh" size={22} color="#22C55E" />
            </TouchableOpacity>
          }
        />

        {/* ─── Tab Bar ─── */}
        <View className="flex-row border-b border-slate-800 px-4 pt-2">
          <TouchableOpacity
            onPress={() => setActiveTab('deliver')}
            activeOpacity={0.7}
            className={`mr-2 flex-row items-center gap-1.5 rounded-t-xl px-4 py-2.5 ${
              activeTab === 'deliver' ? 'bg-green-600/15' : ''
            }`}>
            <MaterialIcons
              name="delivery-dining"
              size={16}
              color={activeTab === 'deliver' ? '#22C55E' : '#64748B'}
            />
            <Text
              className={`text-sm font-semibold ${
                activeTab === 'deliver' ? 'text-green-400' : 'text-slate-500'
              }`}>
              Deliver
            </Text>
            {totalReadyItems > 0 && (
              <View className="rounded-full bg-green-600 px-1.5 py-0.5">
                <Text className="text-[10px] font-bold text-white">{totalReadyItems}</Text>
              </View>
            )}
          </TouchableOpacity>

          {canCreateOrders && (
            <TouchableOpacity
              onPress={() => setActiveTab('new-order')}
              activeOpacity={0.7}
              className={`flex-row items-center gap-1.5 rounded-t-xl px-4 py-2.5 ${
                activeTab === 'new-order' ? 'bg-cyan-600/15' : ''
              }`}>
              <MaterialIcons
                name="add-shopping-cart"
                size={16}
                color={activeTab === 'new-order' ? '#06B6D4' : '#64748B'}
              />
              <Text
                className={`text-sm font-semibold ${
                  activeTab === 'new-order' ? 'text-cyan-400' : 'text-slate-500'
                }`}>
                New Order
              </Text>
              {activeSessions.length > 0 && (
                <View className="rounded-full bg-cyan-600 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-white">{activeSessions.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Deliver Tab ─── */}
        {activeTab === 'deliver' && (
          <FlatList
            data={[]}
            renderItem={null}
            keyExtractor={() => ''}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
            ListHeaderComponent={
              <View>
                {/* Table filter chips */}
                {tables.length > 0 && (
                  <>
                    <Text className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                      Filter by table
                    </Text>
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={tables.sort((a, b) => a.tableNumber - b.tableNumber)}
                      keyExtractor={(t) => String(t.tableNumber)}
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
                  </>
                )}

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
        )}

        {/* ─── New Order Tab ─── */}
        {activeTab === 'new-order' && canCreateOrders && (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}>
            <Text className="mb-1 text-base font-bold text-white">Active Tables</Text>
            <Text className="mb-4 text-sm text-slate-400">
              Select a table to add items for the current session.
            </Text>

            {activeSessions.length === 0 ? (
              <View className="items-center py-16">
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                  <MaterialIcons name="table-restaurant" size={38} color="#334155" />
                </View>
                <Text className="text-base font-semibold text-slate-600">No active sessions</Text>
                <Text className="mt-1 text-sm text-slate-700">
                  Customers must scan the QR code to start a session.
                </Text>
              </View>
            ) : (
              activeSessions.map((session, idx) => (
                <ActiveSessionRow
                  key={session.session?.id ?? idx}
                  session={session}
                  restaurantId={restaurantId}
                  onPress={() => handleNewOrder(session)}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}
