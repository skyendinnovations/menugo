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
      activeOpacity={0.7}
      className="mb-3"
    >
      <Card>
        <CardContent>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-4 flex-1">
              <View className="w-12 h-12 rounded-xl bg-brand/15 items-center justify-center">
                <MaterialIcons name="restaurant" size={24} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-bold">{item.name}</Text>
                {item.description && (
                  <Text className="text-slate-400 text-sm mt-0.5" numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
                {item.address && (
                  <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
                    {item.address}
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <Badge variant={item.isActive ? 'success' : 'destructive'}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <MaterialIcons name="chevron-right" size={22} color="#64748B" />
            </View>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-slate-900 px-5 pt-2">
      <View className="flex-row justify-between items-center mb-5">
        <Text className="text-white text-2xl font-bold">My Restaurants</Text>
        <Button
          title="+ New"
          size="sm"
          onPress={() => router.push('/(admin)/restaurants/create' as any)}
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <FlatList
          data={restaurants}
          renderItem={renderRestaurant}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}
