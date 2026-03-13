import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { tableAPI, type Table } from '@/lib/api';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

/* ── Theme tokens ─────────────────────────────────────────────── */
const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const GRAY_900 = '#111827';
const GRAY_700 = '#374151';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const GRAY_50 = '#F9FAFB';
const WHITE = '#FFFFFF';
const GREEN = '#16A34A';
const GREEN_LIGHT = '#F0FDF4';

export default function TablesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setLoading(true);
          const res = await tableAPI.getAll(restaurantId);
          setTables(res.data || []);
        } catch (error) {
          console.error('Failed to fetch tables:', error);
        } finally {
          setLoading(false);
        }
      })();
    }, [restaurantId])
  );

  const renderTable = ({ item }: { item: Table }) => (
    <TouchableOpacity
      onPress={() => router.push(ROUTES.ADMIN.TABLES.detail(id!, item.id) as any)}
      activeOpacity={0.7}
      style={{
        width: '31%',
        margin: '1%',
        backgroundColor: WHITE,
        borderWidth: 1.5,
        borderColor: item.isActive ? '#BBF7D0' : GRAY_200,
        borderRadius: 16,
        paddingVertical: 20,
        alignItems: 'center',
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
          android: { elevation: 1 },
          default: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as any,
        }),
      }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: item.isActive ? GREEN_LIGHT : GRAY_50,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}>
        <MaterialIcons
          name="table-restaurant"
          size={24}
          color={item.isActive ? GREEN : GRAY_400}
        />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: GRAY_900 }}>#{item.tableNumber}</Text>
      <Text style={{ fontSize: 12, color: GRAY_500, marginTop: 2 }}>Cap: {item.capacity}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: WHITE }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: GRAY_200,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: GRAY_200,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: WHITE,
              }}>
              <Ionicons name="arrow-back" size={20} color={GRAY_700} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: GRAY_900 }}>Tables</Text>
              <Text style={{ fontSize: 13, color: GRAY_500 }}>
                {tables.length} table{tables.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push(ROUTES.ADMIN.TABLES.create(id!) as any)}
            activeOpacity={0.85}
            style={{
              backgroundColor: RED,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              ...Platform.select({
                ios: { shadowColor: RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
                android: { elevation: 4 },
                default: { boxShadow: '0 3px 10px rgba(220,38,38,0.2)' } as any,
              }),
            }}>
            <Ionicons name="add" size={18} color={WHITE} />
            <Text style={{ color: WHITE, fontSize: 14, fontWeight: '600' }}>Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={RED} />
          </View>
        ) : (
          <FlatList
            data={tables.sort((a, b) => a.tableNumber - b.tableNumber)}
            renderItem={renderTable}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 8,
              paddingTop: 12,
              paddingBottom: 40,
              maxWidth: 600,
              width: '100%',
              alignSelf: 'center' as any,
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    backgroundColor: GRAY_50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                  <MaterialIcons name="table-restaurant" size={36} color={GRAY_400} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: GRAY_500 }}>No tables yet</Text>
                <Text style={{ fontSize: 14, color: GRAY_400, marginTop: 4 }}>Add tables to get started</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}
