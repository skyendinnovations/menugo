import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, useWindowDimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Badge, Switch, Dialog, DialogContent, Input, Label, Textarea, Card, CardContent } from '@/components/ui';

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
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;
  
  const [restaurants, setRestaurants] = useState(DUMMY_RESTAURANTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    isActive: true,
  });
  const [errors, setErrors] = useState({
    name: false,
    phone: false,
    email: false,
  });

  const toggleRestaurantStatus = (id: string) => {
    setRestaurants(prev =>
      prev.map(restaurant =>
        restaurant.id === id
          ? { ...restaurant, isActive: !restaurant.isActive }
          : restaurant
      )
    );
  };

  const handleSubmit = () => {
    const newErrors = {
      name: !formData.name.trim(),
      phone: !formData.phone.trim(),
      email: !formData.email.trim(),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    Alert.alert('Success', 'Restaurant created successfully!');
    
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    });
    setErrors({ name: false, phone: false, email: false });
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    });
    setErrors({ name: false, phone: false, email: false });
    setIsModalOpen(false);
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: isWeb ? 24 : 16 }}>
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
            onPress={() => setIsModalOpen(true)}
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

          {/* Restaurants Grid */}
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -8 }}>
            {restaurants.map((restaurant) => {
              const cardWidth = isLargeScreen ? '33.333%' : isMediumScreen ? '50%' : '100%';
              return (
                <View key={restaurant.id} style={{ width: cardWidth, paddingHorizontal: 8, marginBottom: 16 }}>
                  <Card className="bg-gray-900 border-gray-800 rounded-xl">
                    <CardContent className="p-4">
                      {/* Card Header */}
                      <View className="flex-row items-start justify-between mb-3">
                        <View className="flex-1 mr-3">
                          <Text className="text-white font-bold text-base mb-1">
                            {restaurant.name}
                          </Text>
                          <Text className="text-gray-400 text-xs">
                            Created: {new Date(restaurant.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                        <View className="flex-row items-center bg-gray-800 rounded-lg px-3 py-2">
                          <Text className="text-gray-300 text-xs font-medium mr-2">Toggle</Text>
                          <Switch
                            checked={restaurant.isActive}
                            onCheckedChange={() => toggleRestaurantStatus(restaurant.id)}
                          />
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                </View>
              );
            })}
          </View>

          {/* Empty State */}
          {restaurants.length === 0 && (
            <View className="items-center justify-center py-16 px-6">
              <Text className="text-gray-300 font-semibold text-lg mb-2">No restaurants yet</Text>
              <Text className="text-gray-500 text-center text-sm">Add your first restaurant to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Restaurant Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          style={{ 
            width: isWeb ? '90%' : '95%', 
            maxWidth: 600,
            maxHeight: '85%',
            backgroundColor: '#111827',
            borderColor: '#1F2937',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* Modal Header with Close Button */}
          <View className="flex-row items-center justify-between p-5 border-b border-gray-800 bg-gray-900">
            <View className="flex-row items-center flex-1">
              <View className="bg-red-600 p-2 rounded-lg mr-3">
                <MaterialIcons name="store" size={22} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">Add New Restaurant</Text>
                <Text className="text-gray-400 text-xs mt-0.5">Fill in the restaurant details</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => setIsModalOpen(false)}
              className="bg-gray-800 p-2 rounded-lg active:bg-gray-700"
            >
              <MaterialIcons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 20 }}>
            <View>
              {/* Restaurant Name */}
              <View style={{ marginBottom: 14 }}>
                <Label required>Restaurant Name</Label>
                <Input
                  placeholder="Enter restaurant name"
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    setErrors({ ...errors, name: false });
                  }}
                  error={errors.name}
                />
                {errors.name && (
                  <Text style={{ marginTop: 4, color: '#EF4444', fontSize: 12, fontWeight: '500' }}>
                    Restaurant name is required
                  </Text>
                )}
              </View>

              {/* Email */}
              <View style={{ marginBottom: 14 }}>
                <Label required>Email</Label>
                <Input
                  placeholder="Enter email address"
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    setErrors({ ...errors, email: false });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />
                {errors.email && (
                  <Text style={{ marginTop: 4, color: '#EF4444', fontSize: 12, fontWeight: '500' }}>
                    Email is required
                  </Text>
                )}
              </View>

              {/* Phone */}
              <View style={{ marginBottom: 14 }}>
                <Label required>Phone Number</Label>
                <Input
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChangeText={(text) => {
                    setFormData({ ...formData, phone: text });
                    setErrors({ ...errors, phone: false });
                  }}
                  keyboardType="phone-pad"
                  error={errors.phone}
                />
                {errors.phone && (
                  <Text style={{ marginTop: 4, color: '#EF4444', fontSize: 12, fontWeight: '500' }}>
                    Phone number is required
                  </Text>
                )}
              </View>

              {/* Address */}
              <View style={{ marginBottom: 14 }}>
                <Label>Address</Label>
                <Input
                  placeholder="Enter restaurant address"
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 14 }}>
                <Label>Description</Label>
                <Textarea
                  placeholder="Enter restaurant description (optional)"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                />
              </View>

              {/* Active Status */}
              <View className="mb-5">
                <View className="flex-row items-center justify-between bg-gray-800 rounded-lg p-4">
                  <View className="flex-1 mr-3">
                    <Text className="text-white font-semibold text-sm mb-1">Active Status</Text>
                    <Text className="text-gray-400 text-xs">Set restaurant as active or inactive</Text>
                  </View>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row justify-end border-t border-gray-800 pt-4" style={{ gap: 10 }}>
                <TouchableOpacity
                  onPress={handleCancel}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-5 py-3 active:bg-gray-700"
                >
                  <Text className="text-gray-300 text-center font-semibold text-sm">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleSubmit}
                  className="bg-red-600 rounded-lg px-6 py-3 active:bg-red-700"
                >
                  <Text className="text-white text-center font-semibold text-sm">Create Restaurant</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </DialogContent>
      </Dialog>
    </View>
  );
}
