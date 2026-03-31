import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { orderAPI, type Order } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@menugo/dto';
import { restaurantAPI } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';
import { AdminPageHeader } from '@/components/AdminPageHeader';

export default function CashierView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [showBill, setShowBill] = useState(false);
  const [closing, setClosing] = useState(false);
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

  const fetchSessions = useCallback(async () => {
    try {
      const res = await orderAPI.getSessions(restaurantId, true);
      setSessions(res.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleViewBill = async (session: any) => {
    setSelectedSession(session);
    try {
      const sessionData = session.session || session;
      const res = await orderAPI.getOrders(restaurantId);
      const sessionOrderList = (res.data || []).filter(
        (o: Order) => o.tableSessionId === sessionData.id
      );
      setSessionOrders(sessionOrderList);
      setShowBill(true);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleCloseSession = async () => {
    if (!selectedSession) return;
    setClosing(true);
    try {
      const sessionData = selectedSession.session || selectedSession;
      await orderAPI.closeSession(restaurantId, sessionData.id);
      setShowBill(false);
      setSelectedSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Failed to close session:', error);
    } finally {
      setClosing(false);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    sessionOrders.forEach((order) => {
      if (order.status !== 'cancelled') {
        order.items?.forEach((item) => {
          total += parseFloat(item.priceAtOrder) * item.quantity;
        });
      }
    });
    return total;
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
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-900">
        <AdminPageHeader
          title="Cashier"
          subtitle="Active Sessions"
          restaurantId={restaurantId}
          right={
            <TouchableOpacity
              onPress={fetchSessions}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="refresh" size={22} color="#F97316" />
            </TouchableOpacity>
          }
        />

        <View className="flex-1 px-5 pt-3">
          <FlatList
            data={sessions}
            keyExtractor={(item, idx) => String(item.session?.id || idx)}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const session = item.session || item;
              return (
                <TouchableOpacity onPress={() => handleViewBill(item)} activeOpacity={0.7}>
                  <Card className="mb-3">
                    <CardContent>
                      <View className="flex-row items-center justify-between">
                        <View className="mr-3 flex-1">
                          <Text className="text-base font-bold text-white">
                            Table #{item.tableNumber}
                          </Text>
                          {session.customerName ? (
                            <Text className="mt-0.5 text-sm font-semibold text-orange-400">
                              {session.customerName}
                            </Text>
                          ) : null}
                          <Text className="mt-0.5 text-sm text-slate-400">
                            Code: {session.joinCode} | Persons: {session.personsCount}
                          </Text>
                          <Text className="mt-1 text-xs text-slate-500">
                            Started: {new Date(session.startTime).toLocaleTimeString()}
                          </Text>
                        </View>
                        <View className="items-end gap-2">
                          <Badge variant="default">
                            {formatPrice(parseFloat(session.calculatedTotal || '0'), currency)}
                          </Badge>
                          <MaterialIcons name="chevron-right" size={22} color="#64748B" />
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-16">
                <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                  <MaterialIcons name="receipt" size={40} color="#64748B" />
                </View>
                <Text className="text-base text-slate-500">No active sessions</Text>
              </View>
            }
          />

          <Modal visible={showBill} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/60">
              <View className="max-h-[85%] rounded-t-3xl border-t border-slate-700 bg-slate-800 p-5">
                <View className="mb-5 flex-row items-center justify-between">
                  <Text className="text-xl font-bold text-white">Bill Summary</Text>
                  <TouchableOpacity
                    onPress={() => setShowBill(false)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                    <MaterialIcons name="close" size={22} color="#F8FAFC" />
                  </TouchableOpacity>
                </View>

                {selectedSession && (
                  <View className="mb-4">
                    <Text className="text-slate-400">
                      Table #{selectedSession.tableNumber} | Code:{' '}
                      {(selectedSession.session || selectedSession).joinCode}
                    </Text>
                  </View>
                )}

                <ScrollView>
                  {sessionOrders.map((order) => (
                    <View key={order.id} className="mb-4">
                      <View className="mb-1 flex-row items-center justify-between">
                        <Text className="font-bold text-white">{order.orderNumber}</Text>
                        <Badge variant={order.status === 'cancelled' ? 'destructive' : 'default'}>
                          {order.status}
                        </Badge>
                      </View>
                      {order.items?.map((item, idx) => (
                        <View key={idx} className="ml-4 flex-row justify-between py-1">
                          <Text className="text-sm text-slate-300">
                            {item.quantity}x {item.itemName}
                            {item.variantName ? ` (${item.variantName})` : ''}
                          </Text>
                          <Text className="text-sm text-slate-400">
                            {formatPrice(parseFloat(item.priceAtOrder) * item.quantity, currency)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>

                <View className="mt-4 border-t border-slate-700 pt-5">
                  <View className="mb-5 flex-row justify-between">
                    <Text className="text-xl font-bold text-white">Total</Text>
                    <Text className="text-xl font-bold text-white">
                      {formatPrice(calculateTotal(), currency)}
                    </Text>
                  </View>
                  <Button
                    title="Close Session & Settle Bill"
                    loading={closing}
                    onPress={handleCloseSession}
                    disabled={closing}
                    variant="success"
                    size="lg"
                  />
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </>
  );
}
