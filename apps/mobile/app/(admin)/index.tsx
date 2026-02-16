import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
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
      className="mb-3">
      <Card>
        <CardContent>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-4">
              {item.logo ? (
                <Image
                  source={{
                    uri: item.logo.startsWith('http') ? item.logo : fileAPI.getFullUrl(item.logo),
                  }}
                  className="h-12 w-12 rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand/15">
                  <MaterialIcons name="restaurant" size={24} color="#F97316" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-base font-bold text-white">{item.name}</Text>
                {item.description && (
                  <Text className="mt-0.5 text-sm text-slate-400" numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
                {item.address && (
                  <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
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
      <View className="mb-5 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-white">My Restaurants</Text>
        <Button
          title="+ New"
          size="sm"
          onPress={() => router.push('/(admin)/restaurants/create' as any)}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
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
