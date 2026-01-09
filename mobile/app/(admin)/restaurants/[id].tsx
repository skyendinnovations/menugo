import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Label, Textarea, Switch, Card, CardHeader, CardTitle, CardContent, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui';
import { restaurantAPI, Restaurant } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TableCountRange = 'under_10' | '10_to_20' | '20_to_40' | '40_to_50';

type FormData = {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  tableCountRange: TableCountRange | '';
  workersCount: string;
  seatingCapacity: string;
  operatingHours: string;
  isActive: boolean;
};

export default function RestaurantDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = SCREEN_WIDTH >= 1024;
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    tableCountRange: '',
    workersCount: '',
    seatingCapacity: '',
    operatingHours: '',
    isActive: true,
  });

  const [originalData, setOriginalData] = useState<FormData | null>(null);

  useEffect(() => {
    fetchRestaurantDetails();
  }, [id]);

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      const response = await restaurantAPI.getRestaurantById(Number(id));
      if (response && response.data) {
        const restaurant = response.data;
        const data: FormData = {
          name: restaurant.name || '',
          description: restaurant.description || '',
          address: restaurant.address || '',
          phone: restaurant.phone || '',
          email: restaurant.email || '',
          website: restaurant.website || '',
          logo: restaurant.logo || '',
          tableCountRange: restaurant.tableCountRange || '',
          workersCount: restaurant.workersCount?.toString() || '',
          seatingCapacity: restaurant.seatingCapacity?.toString() || '',
          operatingHours: restaurant.operatingHours ? JSON.stringify(restaurant.operatingHours, null, 2) : '',
          isActive: restaurant.isActive ?? true,
        };
        setFormData(data);
        setOriginalData(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch restaurant details:', err);
      setErrorMessage(err.message || 'Failed to load restaurant details');
      setErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setErrorMessage('Restaurant name is required');
      setErrorDialog(true);
      return;
    }

    setIsSaving(true);

    try {
      const payload: any = {
        name: formData.name,
        isActive: formData.isActive,
      };

      if (formData.description) payload.description = formData.description;
      if (formData.address) payload.address = formData.address;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.email) payload.email = formData.email;
      if (formData.website) payload.website = formData.website;
      if (formData.logo) payload.logo = formData.logo;
      if (formData.tableCountRange) payload.tableCountRange = formData.tableCountRange;
      if (formData.workersCount) payload.workersCount = parseInt(formData.workersCount);
      if (formData.seatingCapacity) payload.seatingCapacity = parseInt(formData.seatingCapacity);
      if (formData.operatingHours) {
        try {
          payload.operatingHours = JSON.parse(formData.operatingHours);
        } catch (e) {
          setIsSaving(false);
          setErrorMessage('Invalid operating hours format. Please enter valid JSON.');
          setErrorDialog(true);
          return;
        }
      }

      await restaurantAPI.updateRestaurant(Number(id), payload);
      
      setIsSaving(false);
      setIsEditing(false);
      setSuccessDialog(true);
      setOriginalData(formData);
    } catch (error: any) {
      console.error('Failed to update restaurant:', error);
      setErrorMessage(error.message || 'Failed to update restaurant. Please try again.');
      setErrorDialog(true);
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await restaurantAPI.deleteRestaurant(Number(id));
      setDeleteDialog(false);
      router.back();
    } catch (error: any) {
      console.error('Failed to delete restaurant:', error);
      setErrorMessage(error.message || 'Failed to delete restaurant. Please try again.');
      setErrorDialog(true);
      setDeleteDialog(false);
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData);
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={{ color: '#9ca3af', marginTop: 16 }}>Loading restaurant details...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: 16, 
            paddingVertical: 24,
            alignItems: 'center'
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ 
            width: '100%', 
            maxWidth: Platform.OS === 'web' ? 800 : SCREEN_WIDTH - 32
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={{ marginRight: 16 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 4 }}>
                  {isEditing ? 'Edit Restaurant' : 'Restaurant Details'}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                  {isEditing ? 'Make changes to your restaurant' : 'View restaurant information'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            {!isEditing ? (
              <View style={{ flexDirection: 'row', marginBottom: 24, gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={{ 
                    flex: 1, 
                    backgroundColor: '#dc2626', 
                    borderRadius: 12, 
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="edit" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDeleteDialog(true)}
                  style={{ 
                    backgroundColor: '#7f1d1d', 
                    borderRadius: 12, 
                    padding: 16,
                    borderWidth: 2,
                    borderColor: '#991b1b'
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="delete" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Two-column layout for desktop */}
            <View style={{ 
              flexDirection: isLargeScreen ? 'row' : 'column',
              ...(isLargeScreen && { gap: 16 }),
              marginBottom: 6 
            }}>
              {/* Left Column */}
              <View style={{ 
                flex: isLargeScreen ? 1 : undefined, 
                width: isLargeScreen ? undefined : '100%',
                ...(isLargeScreen && { paddingRight: 8 })
              }}>
                {/* Basic Information */}
                <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden mb-6">
              <CardHeader className="p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    backgroundColor: '#dc2626', 
                    padding: 10, 
                    borderRadius: 12,
                    marginRight: 12
                  }}>
                    <MaterialIcons name="store" size={24} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle className="text-white text-xl font-bold">
                      Basic Information
                    </CardTitle>
                  </View>
                </View>
              </CardHeader>
              <CardContent className="p-6">
                {/* Restaurant Name */}
                <View className="mb-6">
                  <Label required>Restaurant Name</Label>
                  {isEditing ? (
                    <Input
                      placeholder="Enter restaurant name"
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                    />
                  ) : (
                    <Text style={{ color: 'white', fontSize: 16, marginTop: 8, paddingVertical: 4 }}>
                      {formData.name || 'Not provided'}
                    </Text>
                  )}
                </View>

                {/* Description */}
                <View className="mb-6">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      placeholder="Tell us about your restaurant..."
                      value={formData.description}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, lineHeight: 20 }}>
                      {formData.description || 'No description provided'}
                    </Text>
                  )}
                </View>

                {/* Address */}
                <View className="mb-0">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Textarea
                      placeholder="Enter complete address"
                      value={formData.address}
                      onChangeText={(text) => setFormData({ ...formData, address: text })}
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, lineHeight: 20 }}>
                      {formData.address || 'No address provided'}
                    </Text>
                  )}
                </View>
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden mb-6">
              <CardHeader className="p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    backgroundColor: '#dc2626', 
                    padding: 10, 
                    borderRadius: 12,
                    marginRight: 12
                  }}>
                    <MaterialIcons name="contact-phone" size={24} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle className="text-white text-xl font-bold">
                      Contact Details
                    </CardTitle>
                  </View>
                </View>
              </CardHeader>
              <CardContent className="p-6">
                {/* Phone */}
                <View className="mb-6">
                  <Label>Phone Number</Label>
                  {isEditing ? (
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
                      {formData.phone || 'Not provided'}
                    </Text>
                  )}
                </View>

                {/* Email */}
                <View className="mb-6">
                  <Label>Email Address</Label>
                  {isEditing ? (
                    <Input
                      placeholder="contact@restaurant.com"
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
                      {formData.email || 'Not provided'}
                    </Text>
                  )}
                </View>

                {/* Website */}
                <View className="mb-6">
                  <Label>Website</Label>
                  {isEditing ? (
                    <Input
                      placeholder="https://yourrestaurant.com"
                      value={formData.website}
                      onChangeText={(text) => setFormData({ ...formData, website: text })}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
                      {formData.website || 'Not provided'}
                    </Text>
                  )}
                </View>

                {/* Logo URL */}
                <View className="mb-0">
                  <Label>Logo URL</Label>
                  {isEditing ? (
                    <Input
                      placeholder="https://example.com/logo.png"
                      value={formData.logo}
                      onChangeText={(text) => setFormData({ ...formData, logo: text })}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
                      {formData.logo || 'Not provided'}
                    </Text>
                  )}
                </View>
              </CardContent>
            </Card>
              </View>

              {/* Right Column */}
              <View style={{ 
                flex: isLargeScreen ? 1 : undefined, 
                width: isLargeScreen ? undefined : '100%',
                ...(isLargeScreen && { paddingLeft: 8 })
              }}>
            {/* Operational Details */}
            <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden mb-6">
              <CardHeader className="p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ 
                    backgroundColor: '#dc2626', 
                    padding: 10, 
                    borderRadius: 12,
                    marginRight: 12
                  }}>
                    <MaterialIcons name="settings" size={24} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CardTitle className="text-white text-xl font-bold">
                      Operational Details
                    </CardTitle>
                  </View>
                </View>
              </CardHeader>
              <CardContent className="p-6">
                {/* Table Count Range */}
                <View className="mb-6">
                  <Label>Table Count Range</Label>
                  {isEditing ? (
                    <Select
                      value={formData.tableCountRange}
                      onValueChange={(value) => setFormData({ ...formData, tableCountRange: value as TableCountRange })}
                      placeholder="Select table count range"
                      options={[
                        { label: 'Under 10 tables', value: 'under_10' },
                        { label: '10 to 20 tables', value: '10_to_20' },
                        { label: '20 to 40 tables', value: '20_to_40' },
                        { label: '40 to 50 tables', value: '40_to_50' },
                      ]}
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
                      {formData.tableCountRange 
                        ? formData.tableCountRange.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        : 'Not specified'}
                    </Text>
                  )}
                </View>

                {/* Workers Count */}
                <View className="mb-6">
                  <Label>Number of Workers</Label>
                  {isEditing ? (
                    <Input
                      placeholder="e.g., 15"
                      value={formData.workersCount}
                      onChangeText={(text) => setFormData({ ...formData, workersCount: text })}
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
                      {formData.workersCount || 'Not specified'}
                    </Text>
                  )}
                </View>

                {/* Seating Capacity */}
                <View className="mb-6">
                  <Label>Seating Capacity</Label>
                  {isEditing ? (
                    <Input
                      placeholder="e.g., 80"
                      value={formData.seatingCapacity}
                      onChangeText={(text) => setFormData({ ...formData, seatingCapacity: text })}
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>
                      {formData.seatingCapacity || 'Not specified'}
                    </Text>
                  )}
                </View>

                {/* Operating Hours */}
                <View className="mb-6">
                  <Label>Operating Hours</Label>
                  {isEditing ? (
                    <Textarea
                      placeholder='{"monday": "9:00-17:00", "tuesday": "9:00-17:00"}'
                      value={formData.operatingHours}
                      onChangeText={(text) => setFormData({ ...formData, operatingHours: text })}
                    />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 8, fontFamily: 'monospace' }}>
                      {formData.operatingHours || 'Not configured'}
                    </Text>
                  )}
                </View>

                {/* Active Status */}
                <View className="mb-0">
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    backgroundColor: '#111827', 
                    borderRadius: 12, 
                    padding: 18,
                    borderWidth: 1,
                    borderColor: '#374151'
                  }}>
                    <View className="flex-1">
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <MaterialIcons name="power-settings-new" size={20} color="#10b981" />
                        <Text className="text-white font-bold text-base ml-2">
                          Active Status
                        </Text>
                      </View>
                      <Text className="text-gray-400 text-sm">
                        Restaurant is {formData.isActive ? 'visible' : 'hidden'} to customers
                      </Text>
                    </View>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => isEditing && setFormData({ ...formData, isActive: checked })}
                      disabled={!isEditing}
                    />
                  </View>
                </View>
              </CardContent>
            </Card>
              </View>
            </View>

            {/* Edit Mode Action Buttons */}
            {isEditing && (
              <View className="mb-8">
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving}
                  style={{ 
                    backgroundColor: isSaving ? '#991b1b' : '#dc2626', 
                    borderRadius: 12, 
                    padding: 16, 
                    marginBottom: 12,
                    opacity: isSaving ? 0.7 : 1
                  }}
                  activeOpacity={0.7}
                >
                  {isSaving ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                        Saving...
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={isSaving}
                  style={{ 
                    backgroundColor: '#1f2937', 
                    borderRadius: 12, 
                    padding: 16,
                    borderWidth: 2, 
                    borderColor: '#374151',
                    opacity: isSaving ? 0.5 : 1
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#d1d5db', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Dialog */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ 
                backgroundColor: '#059669', 
                borderRadius: 50, 
                padding: 16,
                marginBottom: 12
              }}>
                <MaterialIcons name="check-circle" size={48} color="white" />
              </View>
              <DialogTitle>Success!</DialogTitle>
            </View>
          </DialogHeader>
          <DialogDescription style={{ textAlign: 'center', fontSize: 15 }}>
            Restaurant updated successfully!
          </DialogDescription>
          <DialogFooter style={{ justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => {
                setSuccessDialog(false);
                fetchRestaurantDetails();
              }}
              style={{ backgroundColor: '#dc2626', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}
              activeOpacity={0.8}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>OK</Text>
            </TouchableOpacity>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialog} onOpenChange={setErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ 
                backgroundColor: '#991b1b', 
                borderRadius: 50, 
                padding: 16,
                marginBottom: 12
              }}>
                <MaterialIcons name="error" size={48} color="white" />
              </View>
              <DialogTitle>Error</DialogTitle>
            </View>
          </DialogHeader>
          <DialogDescription style={{ textAlign: 'center', fontSize: 15 }}>
            {errorMessage}
          </DialogDescription>
          <DialogFooter style={{ justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => setErrorDialog(false)}
              style={{ backgroundColor: '#dc2626', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 }}
              activeOpacity={0.8}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>OK</Text>
            </TouchableOpacity>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ 
                backgroundColor: '#991b1b', 
                borderRadius: 50, 
                padding: 16,
                marginBottom: 12
              }}>
                <MaterialIcons name="warning" size={48} color="white" />
              </View>
              <DialogTitle>Delete Restaurant?</DialogTitle>
            </View>
          </DialogHeader>
          <DialogDescription style={{ textAlign: 'center', fontSize: 15 }}>
            Are you sure you want to delete this restaurant? This action cannot be undone.
          </DialogDescription>
          <DialogFooter style={{ justifyContent: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => setDeleteDialog(false)}
              style={{ backgroundColor: '#374151', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, flex: 1 }}
              activeOpacity={0.8}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={{ backgroundColor: '#dc2626', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, flex: 1 }}
              activeOpacity={0.8}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Delete</Text>
            </TouchableOpacity>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
