import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MaterialIcons } from '@expo/vector-icons';

interface DashboardCard {
  title: string;
  icon: string;
  route: string;
  color: string;
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
    { title: 'Tables', icon: 'table-restaurant', route: 'tables', color: '#3b82f6' },
    { title: 'Menu', icon: 'restaurant-menu', route: 'menu', color: '#10b981' },
    { title: 'Orders', icon: 'receipt-long', route: 'orders', color: '#f59e0b' },
    { title: 'Members', icon: 'people', route: 'members', color: '#8b5cf6' },
    { title: 'Kitchen', icon: 'soup-kitchen', route: 'kitchen', color: '#ef4444' },
    { title: 'Waiter', icon: 'room-service', route: 'waiter', color: '#06b6d4' },
    { title: 'Cashier', icon: 'point-of-sale', route: 'cashier', color: '#22c55e' },
    { title: 'Edit', icon: 'edit', route: 'edit', color: '#6b7280' },
  ];

  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: restaurant?.name || 'Restaurant' }} />
      <ScrollView className="flex-1 bg-black p-4">
        {restaurant && (
          <View className="mb-6">
            <Text className="text-white text-2xl font-bold">{restaurant.name}</Text>
            {restaurant.description && (
              <Text className="text-gray-400 mt-1">{restaurant.description}</Text>
            )}
            {restaurant.address && (
              <Text className="text-gray-500 text-sm mt-1">{restaurant.address}</Text>
            )}
          </View>
        )}

        <View className="flex-row flex-wrap gap-3">
          {cards.map((card) => (
            <TouchableOpacity
              key={card.route}
              onPress={() =>
                router.push(
                  `/(admin)/restaurants/${id}/${card.route}` as any
                )
              }
              className="w-[48%]"
            >
              <Card>
                <CardContent className="items-center py-6">
                  <MaterialIcons
                    name={card.icon as any}
                    size={36}
                    color={card.color}
                  />
                  <Text className="text-white font-semibold mt-3">
                    {card.title}
                  </Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
