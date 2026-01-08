import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Card, CardHeader, CardTitle, CardContent, Badge, Switch } from '@/components/ui';

// Dummy restaurant data
const DUMMY_RESTAURANTS = [
  {
    id: '1',
    name: 'The Golden Dragon',
    isActive: true,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Bella Italia',
    isActive: true,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Sushi Master',
    isActive: false,
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    name: 'Burger Paradise',
    isActive: true,
    createdAt: '2024-04-05',
  },
  {
    id: '5',
    name: 'Taco Fiesta',
    isActive: false,
    createdAt: '2024-05-12',
  },
  {
    id: '6',
    name: 'Le Petit Bistro',
    isActive: true,
    createdAt: '2024-06-18',
  },
];

export default function RestaurantsScreen() {
  const [restaurants, setRestaurants] = useState(DUMMY_RESTAURANTS);

  const toggleRestaurantStatus = (id: string) => {
    setRestaurants(prev =>
      prev.map(restaurant =>
        restaurant.id === id
          ? { ...restaurant, isActive: !restaurant.isActive }
          : restaurant
      )
    );
  };

  return (
    <ScrollView className="flex-1 bg-black">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-white mb-2">
            My Restaurants
          </Text>
          <Text className="text-gray-400">
            Manage your restaurant listings
          </Text>
        </View>

        {/* Add New Restaurant Button */}
        <Link href="./new_restaurant" asChild>
          <TouchableOpacity className="bg-red-600 rounded-lg p-4 mb-6">
            <Text className="text-white text-center font-semibold text-lg">
              + Add New Restaurant
            </Text>
          </TouchableOpacity>
        </Link>

        {/* Restaurants List */}
        <View>
          {restaurants.map(restaurant => (
            <Card key={restaurant.id} className="bg-gray-900 border-gray-800 mb-4">
              <CardHeader className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <CardTitle className="text-white text-xl mb-2">
                      {restaurant.name}
                    </CardTitle>
                    <Text className="text-gray-400 text-sm">
                      Created: {new Date(restaurant.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="ml-4">
                    <Badge
                      variant={restaurant.isActive ? 'success' : 'destructive'}
                    >
                      {restaurant.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </View>
                </View>
              </CardHeader>
              <CardContent className="p-4">
                <View className="flex-row items-center justify-between border-t border-gray-800 pt-4">
                  <Text className="text-gray-300">
                    Status: {restaurant.isActive ? 'Online' : 'Offline'}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-gray-400 mr-2">Toggle Status</Text>
                    <Switch
                      checked={restaurant.isActive}
                      onCheckedChange={() => toggleRestaurantStatus(restaurant.id)}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Empty State */}
        {restaurants.length === 0 && (
          <View className="items-center justify-center py-12">
            <Text className="text-gray-400 text-lg mb-4">
              No restaurants yet
            </Text>
            <Text className="text-gray-500 text-center">
              Add your first restaurant to get started
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
