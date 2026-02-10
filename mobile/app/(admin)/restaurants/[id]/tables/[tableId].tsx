import { View, Text, ActivityIndicator, Image, Share } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { tableAPI, type Table, type QRData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';

export default function TableDetail() {
  const { id, tableId } = useLocalSearchParams<{ id: string; tableId: string }>();
  const [table, setTable] = useState<Table | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [tablesRes, qrRes] = await Promise.all([
          tableAPI.getAll(restaurantId),
          tableAPI.getQR(restaurantId, Number(tableId)),
        ]);
        const t = (tablesRes.data || []).find(
          (t: Table) => t.id === Number(tableId)
        );
        setTable(t || null);
        setQrData(qrRes.data);
      } catch (error) {
        console.error('Failed to fetch table details:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId, tableId]);

  const handleShare = async () => {
    if (!qrData) return;
    try {
      await Share.share({
        message: `Scan this QR code to order at table ${qrData.tableNumber}: ${qrData.url}`,
        url: qrData.url,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Table #${table?.tableNumber || ''}` }} />
      <View className="flex-1 bg-slate-900 px-5 pt-4">
        {table && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Table #{table.tableNumber}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-400">Capacity: {table.capacity}</Text>
                <Badge variant={table.isActive ? 'success' : 'destructive'}>
                  {table.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </View>
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
                <View className="bg-white p-4 rounded-2xl mb-4">
                  <Image
                    source={{ uri: qrData.qrDataUrl }}
                    style={{ width: 250, height: 250 }}
                    resizeMode="contain"
                  />
                </View>
              )}
              <Text className="text-slate-400 text-sm text-center mb-4">
                {qrData.url}
              </Text>
              <Button
                title="Share QR Code"
                onPress={handleShare}
                icon={<MaterialIcons name="share" size={18} color="#fff" />}
                size="lg"
              />
            </CardContent>
          </Card>
        )}
      </View>
    </>
  );
}
