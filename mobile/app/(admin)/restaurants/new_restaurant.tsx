import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Label, Textarea, Switch, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export default function NewRestaurantScreen() {
  const router = useRouter();
  
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

  const handleSubmit = () => {
    // Validate required fields
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

    // Here you would normally send the data to the backend
    Alert.alert(
      'Success',
      'Restaurant created successfully!',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-black">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-white mb-2">
            Add New Restaurant
          </Text>
          <Text className="text-gray-400">
            Fill in the details to create a new restaurant
          </Text>
        </View>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="p-4">
            <CardTitle className="text-white text-xl">
              Restaurant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {/* Restaurant Name */}
            <View className="mb-4">
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
                <Text className="text-red-600 text-xs mt-1">
                  Restaurant name is required
                </Text>
              )}
            </View>

            {/* Description */}
            <View className="mb-4">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter restaurant description (optional)"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
              />
            </View>

            {/* Address */}
            <View className="mb-4">
              <Label>Address</Label>
              <Input
                placeholder="Enter restaurant address"
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
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
                <Text className="text-red-600 text-xs mt-1">
                  Phone number is required
                </Text>
              )}
            </View>

            {/* Email */}
            <View className="mb-4">
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
                <Text className="text-red-600 text-xs mt-1">
                  Email is required
                </Text>
              )}
            </View>

            {/* Active Status */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between bg-gray-800 rounded-lg p-4">
                <View>
                  <Text className="text-white font-semibold mb-1">
                    Active Status
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    Set restaurant as active or inactive
                  </Text>
                </View>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <View className="mt-6 mb-8">
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-red-600 rounded-lg p-4 mb-3"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Create Restaurant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <Text className="text-gray-300 text-center font-semibold text-lg">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
