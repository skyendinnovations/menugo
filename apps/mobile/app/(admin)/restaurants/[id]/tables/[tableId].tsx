import { View, Text, ActivityIndicator, Image, Share, Platform, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useState, useCallback } from 'react';
import { tableAPI, type Table, type QRData } from '@/lib/api';
import { orderAPI } from '@/lib/api/order';
import { publicAPI } from '@/lib/api/public';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';

export default function TableDetail() {
  const { id, tableId } = useLocalSearchParams<{ id: string; tableId: string }>();
  const [table, setTable] = useState<Table | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const navigation: any = useNavigation();
  const { hasPermission } = usePermissions(Number(id));

  const restaurantId = Number(id);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          setLoading(true);
          const [tablesRes, qrRes, sessionsRes] = await Promise.all([
            tableAPI.getAll(restaurantId),
            tableAPI.getQR(restaurantId, Number(tableId)),
            orderAPI.getSessions(restaurantId, true)
          ]);
          if (!isActive) return;
          const t = (tablesRes.data || []).find((t: Table) => t.id === Number(tableId));
          setTable(t || null);
          if (t) {
            navigation.setOptions({ title: `Table #${t.tableNumber}` });
          }
          setQrData(qrRes.data);
          
          const sessionMatch = (sessionsRes.data || []).find(
            (s: any) => (s.session?.tableId || s.tableId) === Number(tableId)
          );
          const session = sessionMatch?.session || sessionMatch || null;
          setActiveSession(session);

          // Fetch recent orders for this session!
          if (session) {
            const ordersRes = await publicAPI.getSessionOrders(session.id);
            if (isActive) setSessionOrders(ordersRes.data || []);
          } else {
            if (isActive) setSessionOrders([]);
          }
        } catch (error) {
          console.error('Failed to fetch table details:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      })();
      return () => { isActive = false; };
    }, [restaurantId, tableId])
  );

  const handleShare = async () => {
    if (!qrData) return;
    try {
      if (Platform.OS === 'web') {
        const shareText = `Scan this QR code to order at table ${qrData.tableNumber}: ${qrData.url}`;

        if (typeof navigator !== 'undefined' && 'share' in navigator) {
          await navigator.share({
            title: `Table #${qrData.tableNumber}`,
            text: shareText,
            url: qrData.url,
          });
          return;
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(qrData.url);
          Alert.alert('QR link copied', 'The QR URL has been copied to your clipboard.');
          return;
        }

        Alert.alert('Sharing unavailable', qrData.url);
        return;
      }

      await Share.share({
        message: `Scan this QR code to order at table ${qrData.tableNumber}: ${qrData.url}`,
        url: qrData.url,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const shareButtonTitle = Platform.OS === 'web' ? 'Copy QR Link' : 'Share QR Code';

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Table #${table?.tableNumber || ''}`, headerShown: false }} />
      <ScrollView
        className="flex-1 bg-gray-100"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
        {table && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Table #{table.tableNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600">Capacity: {table.capacity}</Text>
                <Badge variant={table.isActive ? 'success' : 'destructive'}>
                  {table.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Active Session Info */}
        {activeSession && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Active Session</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-gray-600 mb-2">Customers: {activeSession.personsCount}</Text>
              
              {/* {sessionOrders.length > 0 && (
                <View className="mt-2 pt-3 border-t border-slate-700">
                  <Text className="font-bold text-white mb-2 text-base">Current Orders</Text>
                  {sessionOrders.map((order, idx) => (
                    <View key={order.id || idx} className="mb-3 bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-sm">
                      <View className="flex-row justify-between items-center border-b border-slate-700 pb-2 mb-2">
                        <Text className="font-bold text-slate-300">Order #{order.orderNumber}</Text>
                        <Badge variant={order.status === 'delivered' ? 'success' : 'default'}>{order.status}</Badge>
                      </View>
                      {(order.items || []).map((item: any, i: number) => (
                        <View key={item.id || i} className="flex-row justify-between mb-1 items-center">
                          <Text className="text-white flex-1">{item.quantity}× {item.itemName}</Text>
                          <Text className="text-slate-400 text-xs uppercase" numberOfLines={1}>{item.status}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )} */}

              {hasPermission('create_orders') && (
                <Button
                  title="Create Order for Table"
                  onPress={() => router.push(`/restaurants/${id}/tables/${tableId}/add-order?sessionId=${activeSession.id}` as any)}
                  className="mt-4"
                  icon={<MaterialIcons name="add-shopping-cart" size={18} color="#fff" />}
                />
              )}
            </CardContent>
          </Card>
        )}

        {qrData && (
          <Card>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
            </CardHeader>
            <CardContent className="items-center">
              {qrData.qrDataUrl && (
                <View className="mb-4 rounded-2xl bg-transparent p-4">
                  <Image
                    source={{ uri: qrData.qrDataUrl }}
                    style={{ width: 250, height: 250 }}
                    resizeMode="contain"
                  />
                </View>
              )}
              <Text className="mb-4 text-center text-sm text-gray-600">{qrData.url}</Text>
              <Button
                title={shareButtonTitle}
                onPress={handleShare}
                icon={<MaterialIcons name="share" size={16} color="#fff" />}
                size="sm"
                className="self-center"
              />
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </>
  );
}
