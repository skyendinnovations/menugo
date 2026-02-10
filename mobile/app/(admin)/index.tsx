import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';
import { authAPI } from '@/lib/api';

export default function RestaurantList() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await restaurantAPI.getAll();
      const data = res.data || [];
      setRestaurants(data);
      if (data.length === 0) {
        router.replace('/(admin)/onboarding' as any);
      }
    } catch (error) {
      console.error('Failed to fetch restaurants:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchRestaurants();
    }, [fetchRestaurants])
  );

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await authAPI.signOut(router);
    } finally {
      setSignOutLoading(false);
    }
  };

  const renderRestaurant = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(admin)/restaurants/${item.id}` as any)}
      className="mb-3"
    >
      <Card>
        <CardContent>
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-white text-lg font-bold">{item.name}</Text>
              {item.description && (
                <Text className="text-gray-400 text-sm mt-1" numberOfLines={1}>
                  {item.description}
                </Text>
              )}
              {item.address && (
                <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                  {item.address}
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-2">
              <Badge variant={item.isActive ? 'success' : 'destructive'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <MaterialIcons name="chevron-right" size={24} color="#6b7280" />
            </View>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-black p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-white text-2xl font-bold">My Restaurants</Text>
        <Button
          title="+ New"
          onPress={() => router.push('/(admin)/restaurants/create' as any)}
          className="bg-red-600 rounded-lg px-4 py-2"
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      ) : (
        <FlatList
          data={restaurants}
          renderItem={renderRestaurant}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View className="mt-4">
        <Button
          title={signOutLoading ? 'Signing Out...' : 'Sign Out'}
          onPress={handleSignOut}
          disabled={signOutLoading}
          className="bg-red-900"
        />
      </View>
    </View>
  );
}
