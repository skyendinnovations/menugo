import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { MaterialIcons } from '@expo/vector-icons';

interface DashboardCard {
  title: string;
  icon: string;
  route: string;
  color: string;
  bg: string;
}

export default function RestaurantDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setLoading(true);
          const res = await restaurantAPI.getById(restaurantId);
          setRestaurant(res.data);
        } catch (error) {
          console.error('Failed to fetch restaurant:', error);
        } finally {
          setLoading(false);
        }
      })();
    }, [restaurantId])
  );

  const cards: DashboardCard[] = [
    { title: 'Tables', icon: 'table-restaurant', route: 'tables', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    { title: 'Menu', icon: 'restaurant-menu', route: 'menu', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    { title: 'Orders', icon: 'receipt-long', route: 'orders', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { title: 'Members', icon: 'people', route: 'members', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
    { title: 'Kitchen', icon: 'soup-kitchen', route: 'kitchen', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    { title: 'Waiter', icon: 'room-service', route: 'waiter', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
    { title: 'Cashier', icon: 'point-of-sale', route: 'cashier', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    { title: 'Edit', icon: 'edit', route: 'edit', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  ];

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ padding: 20 }}>
        {restaurant && (
          <View className="mb-6">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center"
              >
                <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold">{restaurant.name}</Text>
                {restaurant.description && (
                  <Text className="text-slate-400 text-sm mt-1">{restaurant.description}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.route}
              onPress={() => router.push(`/(admin)/restaurants/${id}/${card.route}` as any)}
              activeOpacity={0.7}
              style={{ width: '48%' }}
            >
              <Card>
                <CardContent className="items-center py-7">
                  <View
                    className="w-14 h-14 rounded-2xl items-center justify-center mb-3"
                    style={{ backgroundColor: card.bg }}
                  >
                    <MaterialIcons name={card.icon as any} size={28} color={card.color} />
                  </View>
                  <Text className="text-white font-semibold text-base">{card.title}</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
