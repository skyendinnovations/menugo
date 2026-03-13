/**
 * Unified RBAC Staff Dashboard
 *
 * Sections are rendered SOLELY based on the user's permissions.
 * Role NAMES are irrelevant — a role named "Sample" with order_prepare
 * permission shows the Kitchen section automatically.
 *
 * Permission → Section mapping:
 *   order_prepare              → Kitchen kanban
 *   order_deliver              → Delivery list
 *   close_sessions             → Cashier / Sessions
 *   helper_block_table
 *     OR table_force_release   → Tables management
 *   view_orders (fallback)     → Read-only orders list
 */

import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { orderAPI, tableAPI, restaurantAPI, PermissionError, type Order, type Table } from '@/lib/api';
import { notificationAPI } from '@/lib/api/notification';
import { workflowAPI } from '@/lib/api/workflow';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import { useSSE } from '@/lib/hooks/useSSE';
import { useWorkflow } from '@/lib/hooks/useWorkflow';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { useDemoMode } from '@/lib/hooks/useDemoMode';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useClockIn } from '@/lib/hooks/useClockIn';
import { ShiftTimer } from '@/components/ShiftTimer';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { formatPrice } from '@menugo/dto';
import { refreshEmitter } from '@/lib/realtime';
import { hapticMedium, hapticSuccess, hapticError } from '@/lib/utils/haptics';

// ─── Shared types & helpers ──────────────────────────────────────────────────

/** Human-readable message for any PermissionError thrown by an action handler (7.5). */
const PERM_ERR = "You don't have permission for this action. Contact your manager.";

type TableStatus = 'available' | 'occupied' | 'blocked';
interface TableWithStatus extends Table {
  derivedStatus: TableStatus;
}

const TABLE_STATUS_CONFIG: Record<TableStatus, { color: string; bg: string; icon: string; label: string }> = {
  available: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  icon: 'check-circle', label: 'Available' },
  occupied:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'people',       label: 'Occupied'  },
  blocked:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icon: 'block',         label: 'Blocked'   },
};

function getElapsedMinutes(createdAt?: string) {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function getUrgencyColor(m: number) {
  if (m < 5) return '#22C55E';
  if (m < 15) return '#F59E0B';
  return '#EF4444';
}

// ─── Section: Kitchen ────────────────────────────────────────────────────────

function KitchenSection({ restaurantId, canResend, sseConnected }: { restaurantId: number; canResend: boolean; sseConnected: boolean }) {
  const [resendLoading, setResendLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Workflow-driven column list and status transitions.
  // Excludes terminal statuses (those with no outgoing transition) from the
  // kanban columns — e.g. 'served' and 'paid' are never shown here.
  const { nextStatus, isTerminal, statuses: wfStatuses } = useWorkflow(restaurantId);
  const COLS = wfStatuses.filter((s) => !isTerminal(s) && s !== 'cancelled');
  const COL_COLORS: Record<string, string> = {
    received:  '#F59E0B',
    preparing: '#F97316',
    ready:     '#22C55E',
  };
  /** Returns a colour for any status string, cycling through defaults for custom ones. */
  const colColor = (col: string) => COL_COLORS[col] ?? '#94A3B8';

  const fetchFn = useCallback(async (signal: AbortSignal) => {
    const res = await orderAPI.getKitchenOrders(restaurantId, signal);
    return res.data || [];
  }, [restaurantId]);

  const { orders, loading, hasNewOrders, error, clearError, refresh, dismissNewOrders } = useRealtimeOrders({
    fetchFn,
    interval: 5000,
    vibrateOnNew: true,
    realtimeChannel: 'orders',
  });

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

  // 7.4 — Auto-clear non-destructive action errors after 3 s.
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 3000);
    return () => clearTimeout(t);
  }, [actionError]);

  const handleAccept = async (orderId: number) => {
    hapticMedium();
    try { await notificationAPI.acceptOrder(restaurantId, orderId); refresh(); }
    catch (e: any) {
      hapticError();
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed to accept order');
    }
  };

  const handleAdvance = async (orderId: number, currentStatus: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order && !order.acceptedBy) {
      Alert.alert('Accept Required', 'Accept this order before advancing its status.');
      return;
    }
    const next = nextStatus(currentStatus);
    if (!next) return;
    hapticSuccess();
    try { await orderAPI.updateOrderStatus(restaurantId, orderId, next); refresh(); }
    catch (e: any) {
      hapticError();
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed to update order');
    }
  };

  const handleResend = async (orderId: number) => {
    setResendLoading(orderId);
    try { await orderAPI.resendNotification(restaurantId, orderId); Alert.alert('Sent', 'Notification resent.'); }
    catch (e: any) {
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed to resend');
    }
    finally { setResendLoading(null); }
  };

  if (loading) return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator color="#F97316" />
    </View>
  );

  return (
    <View className="flex-1">
      {/* New order alert */}
      {hasNewOrders && (
        <Animated.View
          style={{
            backgroundColor: flashAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(34,197,94,0)', 'rgba(34,197,94,0.25)'],
            }),
          }}
          className="mx-4 mb-2 flex-row items-center justify-between rounded-xl px-4 py-2.5">
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="notifications-active" size={18} color="#22C55E" />
            <Text className="text-sm font-bold text-green-400">New order received!</Text>
          </View>
          <TouchableOpacity onPress={dismissNewOrders}>
            <MaterialIcons name="close" size={16} color="#64748B" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Header row */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-white">Kitchen Orders</Text>
          {sseConnected && (
            <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5">
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <Text className="text-xs font-medium text-emerald-400">Live</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={refresh}
          className="h-8 w-8 items-center justify-center rounded-xl bg-slate-800">
          <MaterialIcons name="refresh" size={18} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* 7.3 — Fetch-error banner */}
      {error && (
        <ErrorBanner message="Failed to load orders" onRetry={refresh} onDismiss={clearError} />
      )}
      {/* 7.4 — Action-error banner (auto-clears after 3 s) */}
      {actionError && (
        <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
      )}

      {/* Kanban columns */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row px-2">
          {COLS.map((col) => {
            const colOrders = orders.filter((o) => o.status === col);
            return (
              <View key={col} className="mx-1.5 w-72">
                <View
                  className="mb-2 items-center rounded-xl p-2.5"
                  style={{ backgroundColor: colColor(col) + '18' }}>
                  <Text
                    className="text-xs font-bold uppercase"
                    style={{ color: colColor(col) }}>
                    {col} ({colOrders.length})
                  </Text>
                </View>
                {colOrders.map((order) => {
                  const elapsed = getElapsedMinutes(order.createdAt);
                  const uc = getUrgencyColor(elapsed);
                  return (
                    <TouchableOpacity
                      key={order.id}
                      onPress={() => handleAdvance(order.id, order.status)}
                      activeOpacity={0.7}
                      className="mb-3">
                      <Card>
                        <CardContent className="p-3">
                          <View className="mb-2 flex-row items-center justify-between">
                            <Text className="font-bold text-white">{order.orderNumber}</Text>
                            <View className="flex-row items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5">
                              <MaterialIcons name="access-time" size={12} color={uc} />
                              <Text style={{ color: uc }} className="text-xs font-bold">{elapsed}m</Text>
                            </View>
                          </View>

                          {order.tableNumber !== undefined && (
                            <Badge variant="outline" className="mb-2">Table {order.tableNumber}</Badge>
                          )}

                          {order.items?.map((item, i) => (
                            <View key={i} className="py-0.5">
                              <Text className="text-sm font-semibold text-white">
                                {item.quantity}x {item.itemName}
                              </Text>
                              {item.variantName && (
                                <Text className="ml-3 text-xs text-slate-400">{item.variantName}</Text>
                              )}
                              {item.notes && (
                                <Text className="ml-3 text-xs text-amber-400">Note: {item.notes}</Text>
                              )}
                            </View>
                          ))}

                          {order.status === 'received' && !order.acceptedBy && (
                            <TouchableOpacity
                              onPress={(e) => { e.stopPropagation?.(); handleAccept(order.id); }}
                              activeOpacity={0.7}
                              className="mt-2 flex-row items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5">
                              <MaterialIcons name="check" size={16} color="#FFF" />
                              <Text className="text-xs font-bold text-white">Accept Order</Text>
                            </TouchableOpacity>
                          )}

                          {order.acceptedBy && (
                            <View className="mt-1.5 flex-row items-center gap-1">
                              <MaterialIcons name="check-circle" size={12} color="#22C55E" />
                              <Text className="text-xs text-green-400">
                                Accepted{order.acceptedByName ? ` by ${order.acceptedByName}` : ''}
                              </Text>
                            </View>
                          )}

                          <TouchableOpacity
                            onPress={() => handleAdvance(order.id, order.status)}
                            activeOpacity={order.acceptedBy ? 0.7 : 1}
                            className={`mt-2 flex-row items-center justify-center gap-1.5 rounded-lg border py-2 ${
                              order.acceptedBy ? 'border-slate-600' : 'border-slate-700 opacity-40'
                            }`}>
                            <MaterialIcons
                              name="arrow-forward"
                              size={14}
                              color={order.acceptedBy ? '#F97316' : '#64748B'}
                            />
                            <Text
                              className="text-xs font-bold"
                              style={{ color: order.acceptedBy ? '#F97316' : '#64748B' }}>
                              {order.acceptedBy ? 'Advance' : 'Accept First'}
                            </Text>
                          </TouchableOpacity>

                          {canResend && (
                            <TouchableOpacity
                              onPress={(e) => { e.stopPropagation?.(); handleResend(order.id); }}
                              disabled={resendLoading === order.id}
                              className="mt-2 flex-row items-center justify-center gap-1.5 rounded-lg border border-slate-600 py-2">
                              {resendLoading === order.id ? (
                                <ActivityIndicator size="small" color="#F97316" />
                              ) : (
                                <>
                                  <MaterialIcons name="send" size={12} color="#F97316" />
                                  <Text className="text-xs font-bold text-orange-400">Resend</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </CardContent>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
                {colOrders.length === 0 && (
                  <Text className="py-8 text-center text-xs text-slate-600">No orders</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Section: Delivery ───────────────────────────────────────────────────────

function DeliverySection({ restaurantId }: { restaurantId: number }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [undoOrderId, setUndoOrderId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Workflow-driven: find the status whose next transition is 'served'.
  // This replaces the manual getOrderFlow fetch that was here before.
  const { nextStatus, statuses: wfStatuses } = useWorkflow(restaurantId);
  const deliveryActionStatus: string =
    wfStatuses.find((s) => nextStatus(s) === 'served') ?? 'ready';

  useEffect(() => {
    tableAPI.getAll(restaurantId)
      .then((r) => setTables(r.data || []))
      .catch(() => {});
  }, [restaurantId]);

  const fetchFn = useCallback(async (signal: AbortSignal) => {
    const res = await orderAPI.getDeliveryOrders(restaurantId, signal);
    return res.data || [];
  }, [restaurantId]);

  const { orders, loading, hasNewOrders, error, clearError, refresh, dismissNewOrders } = useRealtimeOrders({
    fetchFn,
    interval: 5000,
    vibrateOnNew: true,
    realtimeChannel: 'orders',
  });

  // 7.4 — Auto-clear non-destructive action errors after 3 s.
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 3000);
    return () => clearTimeout(t);
  }, [actionError]);

  const handleAccept = async (orderId: number) => {
    hapticMedium();
    try { await notificationAPI.acceptOrder(restaurantId, orderId); hapticSuccess(); refresh(); }
    catch (e: any) {
      hapticError();
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed');
    }
  };

  const handleDeliver = async (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (order && !order.acceptedBy) {
      Alert.alert('Accept Required', 'You must accept this order before marking it as delivered.');
      return;
    }
    hapticSuccess();
    try {
      await orderAPI.updateOrderStatus(restaurantId, orderId, 'served');
      setUndoOrderId(orderId);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoOrderId(null), 5000);
      refresh();
    } catch (e: any) {
      hapticError();
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed to deliver order');
    }
  };

  const handleUndo = async () => {
    if (!undoOrderId) return;
    hapticMedium();
    try {
      await orderAPI.updateOrderStatus(restaurantId, undoOrderId, deliveryActionStatus);
      setUndoOrderId(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      refresh();
    } catch (e: any) {
      hapticError();
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed to undo delivery');
    }
  };

  const readyCountByTable: Record<number, number> = {};
  orders.forEach((o) => {
    readyCountByTable[o.tableNumber || 0] = (readyCountByTable[o.tableNumber || 0] || 0) + 1;
  });
  const filteredOrders = selectedTable
    ? orders.filter((o) => o.tableNumber === selectedTable)
    : orders;

  if (loading) return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator color="#F97316" />
    </View>
  );

  return (
    <View className="flex-1 px-4">
      {/* Undo toast */}
      {undoOrderId && (
        <TouchableOpacity
          onPress={handleUndo}
          activeOpacity={0.7}
          className="mb-3 flex-row items-center justify-between rounded-xl bg-slate-700 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="undo" size={18} color="#F59E0B" />
            <Text className="text-sm font-semibold text-amber-400">Marked as delivered</Text>
          </View>
          <Text className="text-xs font-bold text-amber-400">UNDO</Text>
        </TouchableOpacity>
      )}

      {/* New orders banner */}
      {hasNewOrders && (
        <View className="mb-3 flex-row items-center justify-between rounded-xl bg-green-700 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="notifications-active" size={20} color="#FFF" />
            <Text className="font-bold text-white">New orders ready!</Text>
          </View>
          <TouchableOpacity onPress={dismissNewOrders}>
            <MaterialIcons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-white">
          Ready for Delivery ({orders.length})
        </Text>
        <TouchableOpacity
          onPress={refresh}
          className="h-8 w-8 items-center justify-center rounded-xl bg-slate-800">
          <MaterialIcons name="refresh" size={18} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* 7.3 — Fetch-error banner */}
      {error && (
        <ErrorBanner message="Failed to load orders" onRetry={refresh} onDismiss={clearError} />
      )}
      {/* 7.4 — Action-error banner (auto-clears after 3 s) */}
      {actionError && (
        <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
      )}

      {/* Table filter */}
      <FlatList
        data={tables.sort((a, b) => a.tableNumber - b.tableNumber)}
        numColumns={5}
        keyExtractor={(t) => String(t.id)}
        scrollEnabled={false}
        ListHeaderComponent={
          <Text className="mb-2 text-xs text-slate-400">Filter by table</Text>
        }
        renderItem={({ item: t }) => {
          const count = readyCountByTable[t.tableNumber] || 0;
          const sel = selectedTable === t.tableNumber;
          return (
            <TouchableOpacity
              onPress={() => setSelectedTable(sel ? null : t.tableNumber)}
              activeOpacity={0.7}
              className="m-[1%] w-[18%]">
              <Card className={sel ? 'border border-brand' : ''}>
                <CardContent className="items-center py-2">
                  <Text className="text-xs font-bold text-white">#{t.tableNumber}</Text>
                  {count > 0 && (
                    <Badge variant="success" className="mt-0.5">
                      {count}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* Orders list */}
      <Text className="mb-2 mt-3 font-bold text-white">
        {selectedTable ? `Table #${selectedTable}` : 'All Orders'} ({filteredOrders.length})
      </Text>

      <ScrollView>
        {filteredOrders.map((order) => (
          <Card key={order.id} className="mb-3">
            <CardContent>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-bold text-white">{order.orderNumber}</Text>
                  <Badge variant="outline" className="mt-1">Table {order.tableNumber}</Badge>
                </View>
                <View className="flex-row items-center gap-2">
                  {!order.acceptedBy && (
                    <TouchableOpacity
                      onPress={() => handleAccept(order.id)}
                      activeOpacity={0.7}
                      className="h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                      <MaterialIcons name="pan-tool" size={20} color="#FFF" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeliver(order.id)}
                    activeOpacity={order.acceptedBy ? 0.7 : 1}
                    className={`h-12 w-12 items-center justify-center rounded-xl ${
                      order.acceptedBy ? 'bg-green-600' : 'bg-slate-700'
                    }`}>
                    <MaterialIcons
                      name="check"
                      size={22}
                      color={order.acceptedBy ? '#FFF' : '#64748B'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {order.acceptedBy && (
                <View className="mt-1 flex-row items-center gap-1">
                  <MaterialIcons name="check-circle" size={12} color="#22C55E" />
                  <Text className="text-xs text-green-400">
                    Accepted{order.acceptedByName ? ` by ${order.acceptedByName}` : ''}
                  </Text>
                </View>
              )}
              {order.items?.map((item, i) => (
                <Text key={i} className="text-sm text-slate-300">
                  {item.quantity}x {item.itemName}
                </Text>
              ))}
            </CardContent>
          </Card>
        ))}
        {filteredOrders.length === 0 && (
          <Text className="py-10 text-center text-slate-500">No orders ready for delivery</Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Section: Sessions / Cashier ────────────────────────────────────────────

function SessionsSection({ restaurantId }: { restaurantId: number }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  // cashierSession holds the CashierSession entry for the currently open bill.
  const [cashierSession, setCashierSession] = useState<import('@/lib/api/order').CashierSession | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [closing, setClosing] = useState(false);
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    restaurantAPI.getById(restaurantId)
      .then((r) => setCurrency(r.data?.currency || 'INR'))
      .catch(() => {});
  }, [restaurantId]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await orderAPI.getSessions(restaurantId, true);
      setSessions(res.data || []);
    } catch (e) { console.error('fetchSessions error:', e); }
    finally { setLoading(false); }
  }, [restaurantId]);

  useEffect(() => {
    fetchSessions();
    const iv = setInterval(fetchSessions, 15000);
    const unsub = refreshEmitter.subscribe('orders', fetchSessions);
    return () => { clearInterval(iv); unsub(); };
  }, [fetchSessions]);

  const handleViewBill = async (session: any) => {
    setSelectedSession(session);
    try {
      // getCashierOrders returns sessions grouped with their orders.
      // Find the entry matching this session's table.
      const s = session.session || session;
      const res = await orderAPI.getCashierOrders(restaurantId);
      const matched = (res.data || []).find((cs) => cs.sessionId === s.id) ?? null;
      setCashierSession(matched);
      setShowBill(true);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed to load bill'); }
  };

  const calculateTotal = () => {
    if (!cashierSession) return 0;
    return cashierSession.orders.reduce((sum, o) => {
      const orderTotal = o.items.reduce(
        (s, i) => s + Number(i.priceAtOrder || 0) * (i.quantity ?? 1),
        0,
      );
      return sum + orderTotal;
    }, 0);
  };

  const handleCloseSession = () => {
    if (!selectedSession) return;
    const sessionData = selectedSession.session || selectedSession;
    const total = calculateTotal();
    hapticMedium();
    Alert.alert(
      'Settle Bill',
      `Close Table #${selectedSession.tableNumber ?? sessionData.tableNumber}?\nTotal: ${formatPrice(total, currency)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle & Close',
          style: 'destructive',
          onPress: async () => {
            setClosing(true);
            try {
              await orderAPI.closeSession(restaurantId, sessionData.id);
              hapticSuccess();
              setShowBill(false);
              fetchSessions();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed');
            } finally {
              setClosing(false);
            }
          },
        },
      ],
    );
  };

  if (loading) return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator color="#F97316" />
    </View>
  );

  return (
    <View className="flex-1 px-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-white">Active Sessions ({sessions.length})</Text>
        <TouchableOpacity
          onPress={fetchSessions}
          className="h-8 w-8 items-center justify-center rounded-xl bg-slate-800">
          <MaterialIcons name="refresh" size={18} color="#F97316" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {sessions.map((session, i) => {
          const s = session.session || session;
          return (
            <Card key={s.id ?? i} className="mb-3">
              <CardContent>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-bold text-white">
                      Table #{session.tableNumber ?? s.tableNumber}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {s.personsCount ?? 1} person(s)
                    </Text>
                  </View>
                  <Button title="View Bill" size="sm" onPress={() => handleViewBill(session)} />
                </View>
              </CardContent>
            </Card>
          );
        })}
        {sessions.length === 0 && (
          <Text className="py-10 text-center text-slate-500">No active sessions</Text>
        )}
      </ScrollView>

      {/* Bill modal */}
      <Modal
        visible={showBill}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBill(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[80%] rounded-t-3xl bg-slate-800 p-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">
                Table #{selectedSession?.tableNumber}
              </Text>
              <TouchableOpacity onPress={() => setShowBill(false)}>
                <MaterialIcons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mb-4">
              {(cashierSession?.orders ?? []).map((order, i) => (
                <View key={order.id ?? i} className="mb-3">
                  <Text className="mb-1 text-xs font-bold text-slate-400">
                    {order.orderNumber}
                  </Text>
                  {order.items?.map((item, j) => (
                    <View key={j} className="flex-row items-center justify-between py-1">
                      <Text className="text-sm text-white">
                        {item.quantity}x {item.itemName}
                      </Text>
                      <Text className="text-sm text-slate-300">
                        {formatPrice(Number(item.priceAtOrder || 0) * (item.quantity ?? 1), currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View className="mb-4 flex-row items-center justify-between border-t border-slate-600 pt-3">
              <Text className="font-bold text-white">Total</Text>
              <Text className="text-lg font-bold text-orange-400">
                {formatPrice(calculateTotal(), currency)}
              </Text>
            </View>

            <Button
              title={closing ? 'Closing…' : 'Settle & Close'}
              variant="success"
              onPress={handleCloseSession}
              disabled={closing}
              loading={closing}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Section: Tables ─────────────────────────────────────────────────────────

function TablesSection({
  restaurantId,
  canBlock,
  canForceRelease,
  sseConnected,
}: {
  restaurantId: number;
  canBlock: boolean;
  canForceRelease: boolean;
  sseConnected: boolean;
}) {
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forceReleaseVisible, setForceReleaseVisible] = useState(false);
  const [forceReleaseTarget, setForceReleaseTarget] = useState<TableWithStatus | null>(null);
  const [forceReleaseReason, setForceReleaseReason] = useState('');
  const [forceReleaseLoading, setForceReleaseLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, sessionsRes] = await Promise.all([
        tableAPI.getAll(restaurantId),
        orderAPI.getSessions(restaurantId, true),
      ]);
      const activeSessions = sessionsRes.data || [];
      const occupiedNums = new Set(
        activeSessions.map((s: any) => (s.session || s).tableNumber ?? s.tableNumber),
      );
      const withStatus: TableWithStatus[] = (tablesRes.data || []).map((t: Table) => {
        let derivedStatus: TableStatus = 'available';
        if ((t as any).helperBlockedBy) derivedStatus = 'blocked';
        else if (occupiedNums.has(t.tableNumber)) derivedStatus = 'occupied';
        return { ...t, derivedStatus };
      });
      setTables(withStatus.sort((a, b) => a.tableNumber - b.tableNumber));
    } catch {}
    finally { setLoading(false); }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30_000);
    const unsub = refreshEmitter.subscribe('tables', fetchData);
    return () => { clearInterval(iv); unsub(); };
  }, [fetchData]);

  // 7.4 — Auto-clear action errors after 3 s.
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 3000);
    return () => clearTimeout(t);
  }, [actionError]);

  const handleBlock = (tableId: number, tableNumber: number) =>
    Alert.alert('Block Table', `Block Table #${tableNumber} for cleaning/maintenance?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          hapticMedium();
          setActionLoading(tableId);
          try { await tableAPI.blockTable(restaurantId, tableId); hapticSuccess(); fetchData(); }
          catch (e: any) { Alert.alert('Error', e?.message || 'Failed to block table'); }
          finally { setActionLoading(null); }
        },
      },
    ]);

  const handleUnblock = async (tableId: number) => {
    hapticMedium();
    setActionLoading(tableId);
    try { await tableAPI.unblockTable(restaurantId, tableId); hapticSuccess(); fetchData(); }
    catch (e: any) {
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed to unblock table');
    }
    finally { setActionLoading(null); }
  };

  const openForceRelease = (table: TableWithStatus) => {
    setForceReleaseTarget(table);
    setForceReleaseReason('');
    setForceReleaseVisible(true);
  };

  const handleForceRelease = async () => {
    if (!forceReleaseTarget || !forceReleaseReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for force-releasing this table.');
      return;
    }
    setForceReleaseLoading(true);
    try {
      await tableAPI.forceRelease(restaurantId, forceReleaseTarget.id, forceReleaseReason.trim());
      hapticSuccess();
      setForceReleaseVisible(false);
      setForceReleaseTarget(null);
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to force-release table');
    } finally {
      setForceReleaseLoading(false);
    }
  };

  const statusCounts = {
    available: tables.filter((t) => t.derivedStatus === 'available').length,
    occupied:  tables.filter((t) => t.derivedStatus === 'occupied').length,
    blocked:   tables.filter((t) => t.derivedStatus === 'blocked').length,
  };

  if (loading) return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator color="#F97316" />
    </View>
  );

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-white">Table Status</Text>
          {sseConnected && (
            <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5">
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <Text className="text-xs font-medium text-emerald-400">Live</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={fetchData}
          className="h-8 w-8 items-center justify-center rounded-xl bg-slate-800">
          <MaterialIcons name="refresh" size={18} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View className="mb-3 flex-row gap-3 px-4">
        {(['available', 'occupied', 'blocked'] as TableStatus[]).map((status) => {
          const cfg = TABLE_STATUS_CONFIG[status];
          return (
            <View
              key={status}
              className="flex-1 items-center rounded-xl py-2.5"
              style={{ backgroundColor: cfg.bg }}>
              <Text className="text-xl font-bold" style={{ color: cfg.color }}>
                {statusCounts[status]}
              </Text>
              <Text className="text-xs" style={{ color: cfg.color }}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>

      {/* 7.4 — Action-error banner (auto-clears after 3 s) */}
      {actionError && (
        <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
      )}

      {/* Table grid */}
      <FlatList
        data={tables}
        numColumns={3}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const cfg = TABLE_STATUS_CONFIG[item.derivedStatus];
          const isActioning = actionLoading === item.id;
          return (
            <View className="m-[1%] w-[31%]">
              <Card>
                <CardContent className="items-center py-3">
                  <View
                    className="mb-2 h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: cfg.bg }}>
                    <MaterialIcons name={cfg.icon as any} size={22} color={cfg.color} />
                  </View>
                  <Text className="font-bold text-white">#{item.tableNumber}</Text>
                  <Badge
                    variant={
                      item.derivedStatus === 'available' ? 'success'
                        : item.derivedStatus === 'blocked' ? 'destructive'
                          : 'default'
                    }
                    className="mt-1">
                    {cfg.label}
                  </Badge>

                  <View className="mt-2 w-full">
                    {item.derivedStatus === 'available' && canBlock && (
                      <TouchableOpacity
                        onPress={() => handleBlock(item.id, item.tableNumber)}
                        disabled={isActioning}
                        activeOpacity={0.7}
                        className="items-center rounded-lg bg-red-600/20 py-2">
                        {isActioning ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <View className="flex-row items-center gap-1">
                            <MaterialIcons name="block" size={14} color="#EF4444" />
                            <Text className="text-xs font-bold text-red-400">Block</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    {item.derivedStatus === 'blocked' && canBlock && (
                      <TouchableOpacity
                        onPress={() => handleUnblock(item.id)}
                        disabled={isActioning}
                        activeOpacity={0.7}
                        className="items-center rounded-lg bg-green-600/20 py-2">
                        {isActioning ? (
                          <ActivityIndicator size="small" color="#22C55E" />
                        ) : (
                          <View className="flex-row items-center gap-1">
                            <MaterialIcons name="check-circle" size={14} color="#22C55E" />
                            <Text className="text-xs font-bold text-green-400">Unblock</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    {item.derivedStatus === 'occupied' && (
                      canForceRelease ? (
                        <TouchableOpacity
                          onPress={() => openForceRelease(item)}
                          disabled={isActioning}
                          activeOpacity={0.7}
                          className="items-center rounded-lg bg-amber-600/20 py-2">
                          {isActioning ? (
                            <ActivityIndicator size="small" color="#F59E0B" />
                          ) : (
                            <View className="flex-row items-center gap-1">
                              <MaterialIcons name="lock-open" size={14} color="#F59E0B" />
                              <Text className="text-xs font-bold text-amber-400">Release</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View className="items-center rounded-lg bg-amber-600/10 py-1.5">
                          <Text className="text-xs text-amber-400">In Use</Text>
                        </View>
                      )
                    )}
                  </View>
                </CardContent>
              </Card>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16">
            <MaterialIcons name="table-restaurant" size={48} color="#64748B" />
            <Text className="mt-4 text-slate-500">No tables configured</Text>
          </View>
        }
      />

      {/* Force Release Modal */}
      <Modal
        visible={forceReleaseVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForceReleaseVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setForceReleaseVisible(false)}
            className="flex-1 items-center justify-center bg-black/60 px-6">
            <TouchableOpacity activeOpacity={1} className="w-full rounded-2xl bg-slate-800 p-6">
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                  <MaterialIcons name="lock-open" size={22} color="#F59E0B" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-white">Force Release</Text>
                  <Text className="text-xs text-slate-400">
                    Table #{forceReleaseTarget?.tableNumber}
                  </Text>
                </View>
              </View>
              <Text className="mb-2 text-sm text-slate-400">
                This will end the active session. Please provide a reason.
              </Text>
              <TextInput
                value={forceReleaseReason}
                onChangeText={setForceReleaseReason}
                placeholder="Reason for force release (required)"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="mb-4 rounded-xl bg-slate-700 p-4 text-sm text-white"
              />
              <View className="flex-row gap-3">
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setForceReleaseVisible(false)}
                  className="flex-1"
                />
                <Button
                  title={forceReleaseLoading ? 'Releasing…' : 'Force Release'}
                  variant="danger"
                  onPress={handleForceRelease}
                  disabled={!forceReleaseReason.trim() || forceReleaseLoading}
                  loading={forceReleaseLoading}
                  className="flex-1"
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Section: Orders (view / update / void) ─────────────────────────────────

function OrdersSection({
  restaurantId,
  canUpdate,
  canVoid,
  canResend,
}: {
  restaurantId: number;
  canUpdate: boolean;
  canVoid: boolean;
  canResend: boolean;
}) {
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Workflow-driven: derive active statuses and transitions from the server.
  const { nextStatus, isTerminal, statuses: wfStatuses } = useWorkflow(restaurantId);
  // Active statuses = everything that is NOT a terminal state and NOT cancelled.
  const ACTIVE_STATUSES = wfStatuses.filter((s) => !isTerminal(s) && s !== 'cancelled');

  const STATUS_COLOR: Record<string, string> = {
    received:  '#F59E0B',
    preparing: '#F97316',
    ready:     '#22C55E',
    served:    '#64748B',
  };

  const fetchFn = useCallback(async (signal: AbortSignal) => {
    const res = await orderAPI.getOrdersOverview(restaurantId, undefined, signal);
    return (res.data || []).filter((o) => ACTIVE_STATUSES.includes(o.status ?? '')) as unknown as Order[];
  }, [restaurantId, ACTIVE_STATUSES.join(',')]);

  const { orders, loading, error, clearError, refresh } = useRealtimeOrders({
    fetchFn,
    interval: 10000,
    vibrateOnNew: true,
    realtimeChannel: 'orders',
  });

  // 7.4 — Auto-clear non-destructive action errors after 3 s.
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 3000);
    return () => clearTimeout(t);
  }, [actionError]);

  const handleAdvance = async (order: Order) => {
    const next = nextStatus(order.status);
    if (!next) return;
    hapticMedium();
    try {
      await orderAPI.updateOrderStatus(restaurantId, order.id, next);
      hapticSuccess();
      refresh();
    } catch (e: any) {
      hapticError();
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed to update status');
    }
  };

  const openVoid = (order: Order) => {
    setVoidTarget(order);
    setVoidReason('');
    setVoidModalVisible(true);
  };

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) {
      Alert.alert('Required', 'Please enter a reason to void this order.');
      return;
    }
    setVoidLoading(true);
    try {
      await orderAPI.voidOrder(restaurantId, voidTarget.id, voidReason.trim());
      hapticSuccess();
      setVoidModalVisible(false);
      refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to void order');
    } finally {
      setVoidLoading(false);
    }
  };

  const handleResend = async (orderId: number) => {
    setResendLoading(orderId);
    try {
      await orderAPI.resendNotification(restaurantId, orderId);
      Alert.alert('Sent', 'Notification resent successfully.');
    } catch (e: any) {
      setActionError(e instanceof PermissionError ? PERM_ERR : e?.message || 'Failed to resend notification');
    } finally {
      setResendLoading(null);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  return (
    <View className="flex-1 px-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-white">Active Orders ({orders.length})</Text>
        <TouchableOpacity
          onPress={refresh}
          className="h-8 w-8 items-center justify-center rounded-xl bg-slate-800">
          <MaterialIcons name="refresh" size={18} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* 7.3 — Fetch-error banner */}
      {error && (
        <ErrorBanner message="Failed to load orders" onRetry={refresh} onDismiss={clearError} />
      )}
      {/* 7.4 — Action-error banner (auto-clears after 3 s) */}
      {actionError && (
        <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {orders.map((order) => (
          <Card key={order.id} className="mb-3">
            <CardContent>
              <View className="mb-2 flex-row items-center justify-between">
                <View>
                  <Text className="font-bold text-white">{order.orderNumber}</Text>
                  {order.tableNumber !== undefined && (
                    <Badge variant="outline" className="mt-1">
                      Table {order.tableNumber}
                    </Badge>
                  )}
                </View>
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{ backgroundColor: (STATUS_COLOR[order.status] ?? '#64748B') + '28' }}>
                  <Text
                    className="text-xs font-bold capitalize"
                    style={{ color: STATUS_COLOR[order.status] ?? '#94A3B8' }}>
                    {order.status}
                  </Text>
                </View>
              </View>

              {(order.items ?? []).map((item, i) => (
                <Text key={i} className="text-sm text-slate-300">
                  {item.quantity}× {item.itemName}
                  {item.variantName ? ` (${item.variantName})` : ''}
                </Text>
              ))}

              <View className="mt-3 flex-row flex-wrap gap-2">
                {canUpdate && nextStatus(order.status) && (
                  <TouchableOpacity
                    onPress={() => handleAdvance(order)}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5">
                    <MaterialIcons name="arrow-forward" size={14} color="#F97316" />
                    <Text className="text-xs font-bold capitalize text-orange-400">
                      → {nextStatus(order.status)}
                    </Text>
                  </TouchableOpacity>
                )}
                {canVoid && ['received', 'preparing'].includes(order.status) && (
                  <TouchableOpacity
                    onPress={() => openVoid(order)}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-1 rounded-lg border border-red-800 px-3 py-1.5">
                    <MaterialIcons name="cancel" size={14} color="#EF4444" />
                    <Text className="text-xs font-bold text-red-400">Void</Text>
                  </TouchableOpacity>
                )}
                {canResend && (
                  <TouchableOpacity
                    onPress={() => handleResend(order.id)}
                    disabled={resendLoading === order.id}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5">
                    {resendLoading === order.id ? (
                      <ActivityIndicator size="small" color="#F97316" />
                    ) : (
                      <>
                        <MaterialIcons name="send" size={12} color="#F97316" />
                        <Text className="text-xs font-bold text-orange-400">Resend</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <Text className="py-10 text-center text-slate-500">No active orders</Text>
        )}
      </ScrollView>

      {/* Void Order Modal */}
      <Modal
        visible={voidModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVoidModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setVoidModalVisible(false)}
            className="flex-1 items-center justify-center bg-black/60 px-6">
            <TouchableOpacity activeOpacity={1} className="w-full rounded-2xl bg-slate-800 p-6">
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                  <MaterialIcons name="cancel" size={22} color="#EF4444" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-white">Void Order</Text>
                  <Text className="text-xs text-slate-400">{voidTarget?.orderNumber}</Text>
                </View>
              </View>
              <TextInput
                value={voidReason}
                onChangeText={setVoidReason}
                placeholder="Reason for voiding (required)"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="mb-4 rounded-xl bg-slate-700 p-4 text-sm text-white"
              />
              <View className="flex-row gap-3">
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setVoidModalVisible(false)}
                  className="flex-1"
                />
                <Button
                  title={voidLoading ? 'Voiding…' : 'Void Order'}
                  variant="danger"
                  onPress={handleVoid}
                  disabled={!voidReason.trim() || voidLoading}
                  loading={voidLoading}
                  className="flex-1"
                />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Section definitions ─────────────────────────────────────────────────────

interface SectionDef {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const SECTION_DEFS: Record<string, SectionDef> = {
  kitchen:  { key: 'kitchen',  label: 'Kitchen',  icon: 'soup-kitchen',     color: '#EF4444' },
  delivery: { key: 'delivery', label: 'Delivery', icon: 'room-service',     color: '#06B6D4' },
  sessions: { key: 'sessions', label: 'Cashier',  icon: 'point-of-sale',    color: '#22C55E' },
  tables:   { key: 'tables',   label: 'Tables',   icon: 'table-restaurant', color: '#14B8A6' },
  orders:   { key: 'orders',   label: 'Orders',   icon: 'receipt-long',     color: '#F59E0B' },
};

// ─── Main: StaffDashboard ─────────────────────────────────────────────────────

export default function StaffDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = Number(id);

  const { isDemoMode } = useDemoMode(restaurantId);
  const { isClockedIn, clockedInAt, clockLoading, handleClockToggle } = useClockIn(restaurantId);
  const { isOwner, hasPermission, loading: permLoading } = usePermissions(restaurantId);
  // Single SSE connection for the whole dashboard — sub-sections receive sseConnected as a prop
  const { connected: sseConnected } = useSSE(restaurantId);

  // 7.2 — Show a banner after 10 s of continuous SSE disconnection; auto-dismiss on reconnect.
  const [sseDisconnected, setSseDisconnected] = useState(false);
  const sseDisconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (sseConnected) {
      if (sseDisconnectTimerRef.current) clearTimeout(sseDisconnectTimerRef.current);
      setSseDisconnected(false);
    } else {
      sseDisconnectTimerRef.current = setTimeout(() => setSseDisconnected(true), 10_000);
    }
    return () => {
      if (sseDisconnectTimerRef.current) clearTimeout(sseDisconnectTimerRef.current);
    };
  }, [sseConnected]);

  // ── Permission flags ──────────────────────────────────────────────────────
  const canPrepare    = isOwner || hasPermission('order_prepare');
  const canDeliver    = isOwner || hasPermission('order_deliver');
  const canSessions   = isOwner || hasPermission('close_sessions');
  const canBlockTable = isOwner || hasPermission('helper_block_table');
  const canRelease    = isOwner || hasPermission('table_force_release');
  const canResend     = isOwner || hasPermission('resend_notification');
  // view_orders, update_orders, modify_order → Orders section
  // These must NOT be in ADMIN_PERMISSIONS so custom roles with only these
  // perms still reach the staff page instead of the full admin dashboard.
  const canViewOrders   = isOwner || hasPermission('view_orders');
  const canUpdateOrders = isOwner || hasPermission('update_orders');
  const canVoid         = isOwner || hasPermission('modify_order');

  // ── Compute which sections to show (based on permissions, NOT role name) ─
  const sections = useMemo<SectionDef[]>(() => {
    const result: SectionDef[] = [];
    if (canPrepare)                          result.push(SECTION_DEFS.kitchen);
    if (canDeliver)                          result.push(SECTION_DEFS.delivery);
    if (canSessions)                         result.push(SECTION_DEFS.sessions);
    if (canBlockTable || canRelease)         result.push(SECTION_DEFS.tables);
    // Orders section is shown for any of the three order-management perms
    // but only when the user doesn't already have a more specific section
    // (kitchen/delivery already cover those workflows).
    if ((canViewOrders || canUpdateOrders || canVoid) && !canPrepare && !canDeliver)
      result.push(SECTION_DEFS.orders);
    return result;
  }, [canPrepare, canDeliver, canSessions, canBlockTable, canRelease, canViewOrders, canUpdateOrders, canVoid]);

  const [activeTab, setActiveTab] = useState('');

  // Keep activeTab in sync with available sections.
  // Handles: initial load (empty → first section) and permission changes
  // (admin removes perm → active tab no longer in list → reset to first).
  useEffect(() => {
    const keys = sections.map((s) => s.key);
    if (sections.length === 0) {
      setActiveTab('');
    } else if (!keys.includes(activeTab)) {
      setActiveTab(sections[0].key);
    }
  }, [sections, activeTab]);

  if (permLoading) {
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
          title: 'My Dashboard',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-slate-900">
        <DemoModeBanner visible={isDemoMode} />

        {/* 7.2 — SSE disconnect banner (shown after 10 s of continuous disconnection) */}
        {sseDisconnected && (
          <ErrorBanner
            message="Live updates paused — retrying…"
            onDismiss={() => setSseDisconnected(false)}
          />
        )}

        {/* Clock In / Out + Shift Timer */}
        <View className="mx-4 mt-2 mb-2 flex-row items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <MaterialIcons
              name={isClockedIn ? 'toggle-on' : 'toggle-off'}
              size={28}
              color={isClockedIn ? '#22C55E' : '#64748B'}
            />
            <Text
              className={
                isClockedIn ? 'font-semibold text-green-400' : 'font-semibold text-slate-400'
              }>
              {isClockedIn ? 'On Shift' : 'Off Shift'}
            </Text>
            <ShiftTimer clockedInAt={clockedInAt} isClockedIn={isClockedIn} />
          </View>
          <Button
            title={clockLoading ? '...' : isClockedIn ? 'Clock Out' : 'Clock In'}
            size="sm"
            variant={isClockedIn ? 'danger' : 'success'}
            onPress={handleClockToggle}
            disabled={clockLoading}
          />
        </View>

        {/* Dynamic Tab Bar — only shown when there are multiple sections */}
        {sections.length > 1 && (
          <View className="mx-4 mb-2 flex-row rounded-xl bg-slate-800 p-1">
            {sections.map((section) => {
              const isActive = activeTab === section.key;
              return (
                <TouchableOpacity
                  key={section.key}
                  onPress={() => setActiveTab(section.key)}
                  activeOpacity={0.7}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 ${
                    isActive ? 'bg-slate-700' : ''
                  }`}
                  style={isActive ? { borderWidth: 1, borderColor: section.color + '50' } : {}}>
                  <MaterialIcons
                    name={section.icon}
                    size={15}
                    color={isActive ? section.color : '#64748B'}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}>
                    {section.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* No permissions state */}
        {sections.length === 0 && (
          <View className="flex-1 items-center justify-center px-8">
            <MaterialIcons name="lock-outline" size={56} color="#475569" />
            <Text className="mt-4 text-center text-lg font-semibold text-slate-400">
              No Operational Permissions
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              Ask your manager to assign at least one operational permission to your role
              (e.g. order_prepare, order_deliver, close_sessions, view_orders,
              helper_block_table, table_force_release).
            </Text>
          </View>
        )}

        {/* Sections stay mounted to preserve state & keep polling alive.
            Visibility is toggled via display:flex/none — no unmount on tab switch. */}
        {canPrepare && (
          <View style={{ flex: 1, display: activeTab === 'kitchen' ? 'flex' : 'none' }}>
            <KitchenSection restaurantId={restaurantId} canResend={canResend} sseConnected={sseConnected} />
          </View>
        )}
        {canDeliver && (
          <View style={{ flex: 1, display: activeTab === 'delivery' ? 'flex' : 'none' }}>
            <DeliverySection restaurantId={restaurantId} />
          </View>
        )}
        {canSessions && (
          <View style={{ flex: 1, display: activeTab === 'sessions' ? 'flex' : 'none' }}>
            <SessionsSection restaurantId={restaurantId} />
          </View>
        )}
        {(canBlockTable || canRelease) && (
          <View style={{ flex: 1, display: activeTab === 'tables' ? 'flex' : 'none' }}>
            <TablesSection
              restaurantId={restaurantId}
              canBlock={canBlockTable}
              canForceRelease={canRelease}
              sseConnected={sseConnected}
            />
          </View>
        )}
        {(canViewOrders || canUpdateOrders || canVoid) && !canPrepare && !canDeliver && (
          <View style={{ flex: 1, display: activeTab === 'orders' ? 'flex' : 'none' }}>
            <OrdersSection
              restaurantId={restaurantId}
              canUpdate={canUpdateOrders}
              canVoid={canVoid}
              canResend={canResend}
            />
          </View>
        )}
      </View>
    </>
  );
}
