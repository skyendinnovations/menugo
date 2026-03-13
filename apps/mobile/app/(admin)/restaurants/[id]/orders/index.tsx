import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { orderAPI, type Order, type OrderItem } from '@/lib/api';
import { formatPrice } from '@menugo/dto';
import { restaurantAPI } from '@/lib/api';
import { workflowAPI, type OrderFlow } from '@/lib/api/workflow';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useSSE } from '@/lib/hooks/useSSE';
import { refreshEmitter } from '@/lib/realtime';

/* ── Theme tokens ─────────────────────────────────────────────── */
const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const RED_MUTED = '#FCA5A5';
const GRAY_900 = '#111827';
const GRAY_700 = '#374151';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const GRAY_50 = '#F9FAFB';
const WHITE = '#FFFFFF';
const GREEN = '#16A34A';
const GREEN_LIGHT = '#F0FDF4';
const BLUE = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';
const AMBER = '#D97706';
const AMBER_LIGHT = '#FFFBEB';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  received: { bg: BLUE_LIGHT, color: BLUE },
  preparing: { bg: AMBER_LIGHT, color: AMBER },
  ready: { bg: GREEN_LIGHT, color: GREEN },
  served: { bg: '#ECFDF5', color: '#059669' },
  paid: { bg: '#F0FDF4', color: '#15803D' },
  cancelled: { bg: RED_LIGHT, color: RED },
  voided: { bg: RED_LIGHT, color: '#991B1B' },
};

export default function OrdersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('INR');

  // Dynamic workflow — fetched from backend
  const [orderFlow, setOrderFlow] = useState<OrderFlow | null>(null);

  const restaurantId = Number(id);
  const { hasPermission, isOwner } = usePermissions(restaurantId);

  const canModifyOrder = isOwner || hasPermission('modify_order');
  const canResendNotification = isOwner || hasPermission('resend_notification');

  // Real-time event polling — triggers refresh via emitter when order events arrive
  useSSE(restaurantId);

  // ── Void dialog state ──
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  // ── Modify items modal state ──
  const [modifyModalVisible, setModifyModalVisible] = useState(false);
  const [modifyTarget, setModifyTarget] = useState<Order | null>(null);
  const [modifyItems, setModifyItems] = useState<OrderItem[]>([]);
  const [modifyLoading, setModifyLoading] = useState(false);

  // ── Resend state ──
  const [resendLoading, setResendLoading] = useState<number | null>(null);

  // Fetch restaurant currency + order flow
  useEffect(() => {
    (async () => {
      try {
        const [restRes, flowRes] = await Promise.all([
          restaurantAPI.getById(restaurantId),
          workflowAPI.getOrderFlow(restaurantId),
        ]);
        setCurrency(restRes.data.currency || 'INR');
        if (flowRes.data) setOrderFlow(flowRes.data);
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

  // Refresh orders when real-time events arrive (from SSE or push)
  useEffect(() => {
    return refreshEmitter.subscribe('orders', fetchOrders);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      await orderAPI.updateOrderStatus(restaurantId, orderId, newStatus);
      fetchOrders();
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  // ── Void order ──
  const openVoidDialog = (order: Order) => {
    setVoidTarget(order);
    setVoidReason('');
    setVoidModalVisible(true);
  };

  const handleVoidOrder = async () => {
    if (!voidTarget || !voidReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for voiding this order.');
      return;
    }
    setVoidLoading(true);
    try {
      await orderAPI.voidOrder(restaurantId, voidTarget.id, voidReason.trim());
      setVoidModalVisible(false);
      setVoidTarget(null);
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to void order');
    } finally {
      setVoidLoading(false);
    }
  };

  // ── Modify order items ──
  const openModifyDialog = (order: Order) => {
    setModifyTarget(order);
    setModifyItems(order.items?.map((i) => ({ ...i })) || []);
    setModifyModalVisible(true);
  };

  const handleQuantityChange = (itemId: number, delta: number) => {
    setModifyItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
      )
    );
  };

  const handleSaveModifications = async () => {
    if (!modifyTarget) return;
    setModifyLoading(true);
    try {
      for (const item of modifyItems) {
        const original = modifyTarget.items?.find((o) => o.id === item.id);
        if (!original) continue;
        if (item.quantity === 0) {
          await orderAPI.modifyOrderItem(restaurantId, modifyTarget.id, item.id, {
            removed: true,
          });
        } else if (item.quantity !== original.quantity) {
          await orderAPI.modifyOrderItem(restaurantId, modifyTarget.id, item.id, {
            quantity: item.quantity,
          });
        }
      }
      setModifyModalVisible(false);
      setModifyTarget(null);
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to modify order');
    } finally {
      setModifyLoading(false);
    }
  };

  // ── Resend notification ──
  const handleResendNotification = async (orderId: number) => {
    setResendLoading(orderId);
    try {
      await orderAPI.resendNotification(restaurantId, orderId);
      Alert.alert('Success', 'Notification resent successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend notification');
    } finally {
      setResendLoading(null);
    }
  };

  const getNextStatus = (current: string): string | null => {
    if (!orderFlow) return null;
    return orderFlow.transitions[current] ?? null;
  };

  // Dynamic statuses from the workflow — falls back to defaults while loading
  const statuses = orderFlow?.statuses ?? ['received', 'preparing', 'ready', 'served', 'paid'];

  const renderOrder = (order: Order) => {
    const nextStatus = getNextStatus(order.status);
    const total =
      order.items?.reduce((sum, item) => sum + parseFloat(item.priceAtOrder) * item.quantity, 0) ??
      0;
    const canVoid =
      canModifyOrder && (order.status === 'received' || order.status === 'preparing');
    const canModify = canModifyOrder && order.status === 'received';
    const canResend =
      canResendNotification && order.status !== 'paid' && order.status !== 'cancelled';

    const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.received;

    return (
      <View
        style={{
          backgroundColor: WHITE,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: GRAY_200,
          marginBottom: 14,
          padding: 16,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
            android: { elevation: 1 },
            web: { boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as any,
          }),
        }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: GRAY_900 }}>{order.orderNumber}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: statusStyle.color, textTransform: 'uppercase' }}>
                {order.status}
              </Text>
            </View>
            {(canVoid || canModify || canResend) && (
              <TouchableOpacity
                onPress={() => {
                  const buttons: any[] = [];
                  if (canVoid) buttons.push({ text: 'Void Order', style: 'destructive' as const, onPress: () => openVoidDialog(order) });
                  if (canModify) buttons.push({ text: 'Modify Items', onPress: () => openModifyDialog(order) });
                  if (canResend) buttons.push({ text: 'Resend Notification', onPress: () => handleResendNotification(order.id) });
                  buttons.push({ text: 'Cancel', style: 'cancel' as const });
                  Alert.alert('Order Actions', `Actions for ${order.orderNumber}`, buttons);
                }}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: GRAY_50, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="more-vert" size={18} color={GRAY_500} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Table badge */}
        {order.tableNumber && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: GRAY_50, borderWidth: 1, borderColor: GRAY_200, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: GRAY_700 }}>Table {order.tableNumber}</Text>
          </View>
        )}

        {/* Items */}
        {order.items?.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ fontSize: 14, color: GRAY_700, flex: 1 }}>
              {item.quantity}x {item.itemName}
              {item.variantName ? ` (${item.variantName})` : ''}
            </Text>
            <Text style={{ fontSize: 14, color: GRAY_500 }}>
              {formatPrice(parseFloat(item.priceAtOrder) * item.quantity, currency)}
            </Text>
          </View>
        ))}

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: GRAY_200 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: GRAY_900 }}>
            Total: {formatPrice(total, currency)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {canResend && (
              <TouchableOpacity
                onPress={() => handleResendNotification(order.id)}
                disabled={resendLoading === order.id}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: AMBER_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
                {resendLoading === order.id ? (
                  <ActivityIndicator size="small" color={AMBER} />
                ) : (
                  <MaterialIcons name="send" size={16} color={AMBER} />
                )}
              </TouchableOpacity>
            )}
            {nextStatus && (
              <TouchableOpacity
                onPress={() => handleStatusUpdate(order.id, nextStatus)}
                style={{
                  backgroundColor: RED,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 10,
                  ...Platform.select({
                    ios: { shadowColor: RED, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
                    android: { elevation: 3 },
                    web: { boxShadow: `0 2px 6px ${RED}50` } as any,
                  }),
                }}>
                <Text style={{ color: WHITE, fontSize: 13, fontWeight: '700' }}>
                  {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const [activeTab, setActiveTab] = useState('received');

  // Reset active tab when workflow loads and current tab isn't in the flow
  useEffect(() => {
    if (orderFlow && !orderFlow.statuses.includes(activeTab)) {
      setActiveTab(orderFlow.statuses[0] || 'received');
    }
  }, [orderFlow]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: WHITE }}>
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'ios' ? 56 : 18,
            paddingBottom: 14,
            backgroundColor: WHITE,
            borderBottomWidth: 1,
            borderBottomColor: GRAY_200,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: GRAY_50,
                borderWidth: 1,
                borderColor: GRAY_200,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="arrow-back" size={20} color={GRAY_900} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: GRAY_900 }}>Orders</Text>
              <Text style={{ fontSize: 12, color: GRAY_500, marginTop: 1 }}>
                {orders.length} total
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={fetchOrders}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: RED_LIGHT,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="refresh" size={20} color={RED} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={RED} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* ── Tab bar ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
              {statuses.map((s) => {
                const count = orders.filter((o) => o.status === s).length;
                const isActive = activeTab === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setActiveTab(s)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: isActive ? RED : GRAY_50,
                      borderWidth: isActive ? 0 : 1,
                      borderColor: GRAY_200,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: isActive ? WHITE : GRAY_700,
                      }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── Order list ── */}
            <FlatList
              data={orders.filter((o) => o.status === activeTab)}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 30,
                maxWidth: 600,
                width: '100%',
                alignSelf: 'center',
              }}
              renderItem={({ item }) => renderOrder(item)}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                  <Ionicons name="receipt-outline" size={48} color={GRAY_400} />
                  <Text style={{ fontSize: 15, color: GRAY_500, marginTop: 12, fontWeight: '500' }}>
                    No {activeTab} orders
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </View>

      {/* ── Void Order Modal ── */}
      <Modal
        visible={voidModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVoidModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setVoidModalVisible(false)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 24 }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{
                width: '100%',
                maxWidth: 420,
                borderRadius: 18,
                backgroundColor: WHITE,
                padding: 24,
                ...Platform.select({
                  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
                  android: { elevation: 10 },
                  web: { boxShadow: '0 8px 30px rgba(0,0,0,0.15)' } as any,
                }),
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: RED_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="cancel" size={22} color={RED} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: GRAY_900 }}>Void Order</Text>
                  <Text style={{ fontSize: 12, color: GRAY_500 }}>{voidTarget?.orderNumber}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, color: GRAY_500, marginBottom: 12 }}>
                This action cannot be undone. Please provide a reason.
              </Text>

              <TextInput
                value={voidReason}
                onChangeText={setVoidReason}
                placeholder="Reason for voiding (required)"
                placeholderTextColor={GRAY_400}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  borderWidth: 1.5,
                  borderColor: GRAY_200,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  color: GRAY_900,
                  backgroundColor: GRAY_50,
                  minHeight: 80,
                  marginBottom: 18,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setVoidModalVisible(false)}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: GRAY_200, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: GRAY_700 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleVoidOrder}
                  disabled={!voidReason.trim() || voidLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 13,
                    borderRadius: 12,
                    backgroundColor: !voidReason.trim() || voidLoading ? RED_MUTED : RED,
                    alignItems: 'center',
                  }}>
                  {voidLoading ? (
                    <ActivityIndicator size="small" color={WHITE} />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: WHITE }}>Void Order</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modify Order Items Modal ── */}
      <Modal
        visible={modifyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModifyModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setModifyModalVisible(false)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 24 }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{
                width: '100%',
                maxWidth: 420,
                borderRadius: 18,
                backgroundColor: WHITE,
                padding: 24,
                ...Platform.select({
                  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
                  android: { elevation: 10 },
                  web: { boxShadow: '0 8px 30px rgba(0,0,0,0.15)' } as any,
                }),
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: BLUE_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="edit" size={22} color={BLUE} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: GRAY_900 }}>Modify Items</Text>
                  <Text style={{ fontSize: 12, color: GRAY_500 }}>{modifyTarget?.orderNumber}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, color: GRAY_500, marginBottom: 14 }}>
                Adjust quantities or set to 0 to remove an item.
              </Text>

              <ScrollView style={{ maxHeight: 260 }}>
                {modifyItems.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      backgroundColor: item.quantity === 0 ? RED_LIGHT : GRAY_50,
                      borderWidth: 1,
                      borderColor: item.quantity === 0 ? RED_MUTED : GRAY_200,
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: item.quantity === 0 ? RED : GRAY_900,
                          textDecorationLine: item.quantity === 0 ? 'line-through' : 'none',
                        }}>
                        {item.itemName}
                        {item.variantName ? ` (${item.variantName})` : ''}
                      </Text>
                      <Text style={{ fontSize: 12, color: GRAY_500, marginTop: 2 }}>
                        {formatPrice(parseFloat(item.priceAtOrder), currency)} each
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => handleQuantityChange(item.id, -1)}
                        style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: WHITE, borderWidth: 1.5, borderColor: GRAY_200, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="remove" size={18} color={GRAY_700} />
                      </TouchableOpacity>
                      <Text style={{ width: 24, textAlign: 'center', fontSize: 16, fontWeight: '700', color: GRAY_900 }}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleQuantityChange(item.id, 1)}
                        style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: WHITE, borderWidth: 1.5, borderColor: GRAY_200, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="add" size={18} color={GRAY_700} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
                <TouchableOpacity
                  onPress={() => setModifyModalVisible(false)}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: GRAY_200, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: GRAY_700 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveModifications}
                  disabled={modifyLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 13,
                    borderRadius: 12,
                    backgroundColor: modifyLoading ? RED_MUTED : RED,
                    alignItems: 'center',
                  }}>
                  {modifyLoading ? (
                    <ActivityIndicator size="small" color={WHITE} />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: WHITE }}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
