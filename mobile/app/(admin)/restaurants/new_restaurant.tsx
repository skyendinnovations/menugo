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
      <View className="p-6">
        {/* Header */}
        <View className="mb-8 pt-2">
          <Text className="text-4xl font-bold text-white mb-3">
            Add New Restaurant
          </Text>
          <Text className="text-gray-400 text-base">
            Fill in the details to create a new restaurant
          </Text>
        </View>

        <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-gray-800">
            <CardTitle className="text-white text-2xl font-bold">
              Restaurant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {/* Restaurant Name */}
            <View className="mb-6">
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
                <Text className="text-red-500 text-sm mt-1.5 font-medium">
                  Restaurant name is required
                </Text>
              )}
            </View>

            {/* Description */}
            <View className="mb-6">
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
            <View className="mb-6">
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
            <View className="mb-6">
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
                <Text className="text-red-500 text-sm mt-1.5 font-medium">
                  Phone number is required
                </Text>
              )}
            </View>

            {/* Email */}
            <View className="mb-6">
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
                <Text className="text-red-500 text-sm mt-1.5 font-medium">
                  Email is required
                </Text>
              )}
            </View>

            {/* Active Status */}
            <View className="mb-0">
              <View className="flex-row items-center justify-between bg-gray-800 rounded-xl p-5">
                <View className="flex-1">
                  <Text className="text-white font-bold text-base mb-1">
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
        <View className="mt-8 mb-10">
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-red-600 rounded-xl p-5 mb-4 shadow-lg active:bg-red-700"
          >
            <Text className="text-white text-center font-bold text-lg tracking-wide">
              Create Restaurant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            className="bg-gray-800 rounded-xl p-5 border-2 border-gray-700 active:bg-gray-700"
          >
            <Text className="text-gray-300 text-center font-bold text-lg tracking-wide">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
