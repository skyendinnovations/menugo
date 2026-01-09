import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Badge, Switch, Card, CardContent } from '@/components/ui';
import { restaurantAPI, Restaurant } from '@/lib/api';

export default function RestaurantsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchRestaurants = async () => {
    try {
      setError('');
      const response = await restaurantAPI.getRestaurants();
      if (response && response.data) {
        setRestaurants(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch restaurants:', err);
      setError(err.message || 'Failed to load restaurants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Refetch when screen comes into focus (e.g., after deleting a restaurant)
  useFocusEffect(
    React.useCallback(() => {
      if (!loading) {
        fetchRestaurants();
      }
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  const toggleRestaurantStatus = async (id: number, currentStatus: boolean) => {
    try {
      await restaurantAPI.updateRestaurant(id, { isActive: !currentStatus });
      setRestaurants(prev =>
        prev.map(restaurant =>
          restaurant.id === id
            ? { ...restaurant, isActive: !currentStatus }
            : restaurant
        )
      );
    } catch (err: any) {
      console.error('Failed to update restaurant status:', err);
    }
  };

  const handleRestaurantClick = (id: number) => {
    router.push(`/(admin)/restaurants/${id}`);
  };

  const handleAddRestaurant = () => {
    router.push('/(admin)/restaurants/new_restaurant');
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: isWeb ? 24 : 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#dc2626"
            colors={['#dc2626']}
          />
        }
      >
        <View style={{ maxWidth: isWeb ? 1280 : '100%', width: '100%', marginHorizontal: 'auto' }}>
          {/* Header */}
          <View className="mb-6">
            <Text className="text-white font-bold mb-2" style={{ fontSize: isLargeScreen ? 30 : 24 }}>
              My Restaurants
            </Text>
            <Text className="text-gray-400" style={{ fontSize: isWeb ? 16 : 14 }}>
              Manage your restaurant listings
            </Text>
          </View>

          {/* Add New Restaurant Button */}
          <TouchableOpacity 
            onPress={handleAddRestaurant}
            className="bg-red-600 rounded-xl mb-6 active:bg-red-700"
            style={{ 
              paddingVertical: 14, 
              paddingHorizontal: 20,
              maxWidth: isWeb && isMediumScreen ? 280 : '100%'
            }}
          >
            <Text className="text-white text-center font-bold" style={{ fontSize: 15 }}>
              + Add New Restaurant
            </Text>
          </TouchableOpacity>

          {/* Loading State */}
          {loading && (
            <View className="items-center justify-center py-16">
              <ActivityIndicator size="large" color="#dc2626" />
              <Text className="text-gray-400 mt-4">Loading restaurants...</Text>
            </View>
          )}

          {/* Error State */}
          {!loading && error && (
            <View className="items-center justify-center py-16 px-6">
              <MaterialIcons name="error-outline" size={48} color="#ef4444" />
              <Text className="text-red-400 font-semibold text-lg mb-2 mt-4">Error Loading Restaurants</Text>
              <Text className="text-gray-500 text-center text-sm mb-4">{error}</Text>
              <TouchableOpacity 
                onPress={() => {
                  setLoading(true);
                  fetchRestaurants();
                }}
                className="bg-red-600 rounded-lg px-6 py-3"
              >
                <Text className="text-white font-bold">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Restaurants Grid */}
          {!loading && !error && (
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -8 }}>
              {restaurants.map((restaurant) => {
                const cardWidth = isLargeScreen ? '33.333%' : isMediumScreen ? '50%' : '100%';
                return (
                  <View key={restaurant.id} style={{ width: cardWidth, paddingHorizontal: 8, marginBottom: 16 }}>
                    <TouchableOpacity 
                      onPress={() => handleRestaurantClick(restaurant.id)}
                      activeOpacity={0.7}
                    >
                      <Card className="bg-gray-900 border-gray-800 rounded-xl">
                        <CardContent className="p-4">
                          {/* Card Header */}
                          <View className="flex-row items-start justify-between mb-3">
                            <View className="flex-1 mr-3">
                              <Text className="text-white font-bold text-base mb-1">
                                {restaurant.name}
                              </Text>
                              <Text className="text-gray-400 text-xs">
                                {restaurant.address ? restaurant.address.substring(0, 40) + '...' : 'No address'}
                              </Text>
                            </View>
                            <Badge variant={restaurant.isActive ? 'success' : 'destructive'}>
                              {restaurant.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </View>
                          
                          {/* Divider */}
                          <View className="h-px bg-gray-800 mb-3" />
                          
                          {/* Card Footer */}
                          <View className="flex-row items-center justify-between">
                            <View>
                              <Text className="text-gray-400 text-xs mb-1">Current Status</Text>
                              <Text className="text-white font-semibold text-sm">
                                {restaurant.isActive ? 'Online' : 'Offline'}
                              </Text>
                            </View>
                            <View 
                              className="flex-row items-center bg-gray-800 rounded-lg px-3 py-2"
                              onStartShouldSetResponder={() => true}
                              onTouchEnd={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Text className="text-gray-300 text-xs font-medium mr-2">Toggle</Text>
                              <Switch
                                checked={restaurant.isActive || false}
                                onCheckedChange={() => {
                                  toggleRestaurantStatus(restaurant.id, restaurant.isActive || false);
                                }}
                              />
                            </View>
                          </View>
                        </CardContent>
                      </Card>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {restaurants.length === 0 && (
            <View className="items-center justify-center py-16 px-6">
              <Text className="text-gray-300 font-semibold text-lg mb-2">No restaurants yet</Text>
              <Text className="text-gray-500 text-center text-sm">Add your first restaurant to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
