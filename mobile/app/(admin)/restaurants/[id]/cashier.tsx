import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { orderAPI, type Order, type Session } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';

export default function CashierView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [showBill, setShowBill] = useState(false);
  const [closing, setClosing] = useState(false);

  const restaurantId = Number(id);

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
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Cashier' }} />
      <View className="flex-1 bg-black p-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-xl font-bold">Active Sessions</Text>
          <TouchableOpacity onPress={fetchSessions}>
            <MaterialIcons name="refresh" size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={sessions}
          keyExtractor={(item, idx) => String(item.session?.id || idx)}
          renderItem={({ item }) => {
            const session = item.session || item;
            return (
              <TouchableOpacity onPress={() => handleViewBill(item)}>
                <Card className="mb-3">
                  <CardContent>
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-white font-bold text-base">
                          Table #{item.tableNumber}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                          Code: {session.joinCode} | Persons: {session.personsCount}
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          Started: {new Date(session.startTime).toLocaleTimeString()}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Badge variant="outline">
                          ${session.calculatedTotal || '0.00'}
                        </Badge>
                        <MaterialIcons name="chevron-right" size={24} color="#6b7280" />
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-12">
              <MaterialIcons name="receipt" size={64} color="#374151" />
              <Text className="text-gray-500 mt-4">No active sessions</Text>
            </View>
          }
        />

        {/* Bill Modal */}
        <Modal visible={showBill} animationType="slide" transparent>
          <View className="flex-1 bg-black/90 justify-end">
            <View className="bg-black border-t border-red-900 rounded-t-2xl p-4 max-h-[85%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-xl font-bold">Bill Summary</Text>
                <TouchableOpacity onPress={() => setShowBill(false)}>
                  <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {selectedSession && (
                <View className="mb-4">
                  <Text className="text-gray-400">
                    Table #{selectedSession.tableNumber} | Code:{' '}
                    {(selectedSession.session || selectedSession).joinCode}
                  </Text>
                </View>
              )}

              <ScrollView>
                {sessionOrders.map((order) => (
                  <View key={order.id} className="mb-4">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-white font-bold">{order.orderNumber}</Text>
                      <Badge
                        variant={order.status === 'cancelled' ? 'destructive' : 'default'}
                      >
                        {order.status}
                      </Badge>
                    </View>
                    {order.items?.map((item, idx) => (
                      <View key={idx} className="flex-row justify-between py-1 ml-4">
                        <Text className="text-gray-300">
                          {item.quantity}x {item.itemName}
                          {item.variantName ? ` (${item.variantName})` : ''}
                        </Text>
                        <Text className="text-gray-400">
                          ${(parseFloat(item.priceAtOrder) * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>

              <View className="border-t border-red-900 pt-4 mt-4">
                <View className="flex-row justify-between mb-4">
                  <Text className="text-white text-xl font-bold">Total</Text>
                  <Text className="text-white text-xl font-bold">
                    ${calculateTotal().toFixed(2)}
                  </Text>
                </View>
                <Button
                  title={closing ? 'Closing...' : 'Close Session & Settle Bill'}
                  onPress={handleCloseSession}
                  disabled={closing}
                  className="bg-green-600"
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}
