import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Label, Textarea, Switch, Card, CardHeader, CardTitle, CardContent, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui';
import { restaurantAPI } from '@/lib/api';

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

export default function NewRestaurantScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
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

  const [errors, setErrors] = useState({
    name: false,
  });

  const validateStep1 = () => {
    const newErrors = {
      name: !formData.name.trim(),
    };

    setErrors(newErrors);

    if (newErrors.name) {
      setErrorMessage('Restaurant name is required');
      setErrorDialog(true);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Prepare data for backend
      const payload: any = {
        name: formData.name,
        isActive: formData.isActive,
      };

      // Add optional fields if they have values
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
          setIsSubmitting(false);
          setErrorMessage('Invalid operating hours format. Please enter valid JSON.');
          setErrorDialog(true);
          return;
        }
      }

      console.log('Submitting restaurant data:', payload);

      // Call the API
      const response = await restaurantAPI.createRestaurant(payload);
      
      console.log('API Response:', response);

      // Show success dialog
      setIsSubmitting(false);
      setSuccessDialog(true);
    } catch (error: any) {
      console.error('Failed to create restaurant:', error);
      setErrorMessage(error.message || 'Failed to create restaurant. Please try again.');
      setErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const renderStepIndicator = () => (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginBottom: 32,
      paddingHorizontal: 16
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, maxWidth: 400 }}>
        {/* Step 1 */}
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 24, 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: currentStep >= 1 ? '#dc2626' : '#374151',
            borderWidth: 3,
            borderColor: currentStep === 1 ? '#fee2e2' : 'transparent',
            shadowColor: currentStep === 1 ? '#dc2626' : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: currentStep === 1 ? 8 : 0
          }}>
            {currentStep > 1 ? (
              <MaterialIcons name="check" size={24} color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>1</Text>
            )}
          </View>
          <Text style={{ 
            color: currentStep === 1 ? '#dc2626' : currentStep > 1 ? '#10b981' : '#6b7280', 
            fontSize: 11, 
            fontWeight: '600',
            marginTop: 6
          }}>
            Basic Info
          </Text>
        </View>

        {/* Connector 1 */}
        <View style={{ 
          flex: 1, 
          height: 3, 
          backgroundColor: currentStep >= 2 ? '#dc2626' : '#374151',
          marginHorizontal: -8,
          marginBottom: 20
        }} />

        {/* Step 2 */}
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 24, 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: currentStep >= 2 ? '#dc2626' : '#374151',
            borderWidth: 3,
            borderColor: currentStep === 2 ? '#fee2e2' : 'transparent',
            shadowColor: currentStep === 2 ? '#dc2626' : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: currentStep === 2 ? 8 : 0
          }}>
            {currentStep > 2 ? (
              <MaterialIcons name="check" size={24} color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>2</Text>
            )}
          </View>
          <Text style={{ 
            color: currentStep === 2 ? '#dc2626' : currentStep > 2 ? '#10b981' : '#6b7280', 
            fontSize: 11, 
            fontWeight: '600',
            marginTop: 6
          }}>
            Contact
          </Text>
        </View>

        {/* Connector 2 */}
        <View style={{ 
          flex: 1, 
          height: 3, 
          backgroundColor: currentStep === 3 ? '#dc2626' : '#374151',
          marginHorizontal: -8,
          marginBottom: 20
        }} />

        {/* Step 3 */}
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 24, 
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: currentStep === 3 ? '#dc2626' : '#374151',
            borderWidth: 3,
            borderColor: currentStep === 3 ? '#fee2e2' : 'transparent',
            shadowColor: currentStep === 3 ? '#dc2626' : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: currentStep === 3 ? 8 : 0
          }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>3</Text>
          </View>
          <Text style={{ 
            color: currentStep === 3 ? '#dc2626' : '#6b7280', 
            fontSize: 11, 
            fontWeight: '600',
            marginTop: 6
          }}>
            Details
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    if (currentStep === 1) {
      return (
        <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden">
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
                <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>
                  Enter your restaurant's core details
                </Text>
              </View>
            </View>
          </CardHeader>
          <CardContent className="p-6">
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
                <Text style={{ marginTop: 6, color: '#ef4444', fontSize: 12, fontWeight: '500' }}>
                  Restaurant name is required
                </Text>
              )}
            </View>

            {/* Description */}
            <View className="mb-6">
              <Label>Description</Label>
              <Textarea
                placeholder="Tell us about your restaurant..."
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
              />
              <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
                Optional - Share what makes your restaurant special
              </Text>
            </View>

            {/* Address */}
            <View className="mb-0">
              <Label>Address</Label>
              <Textarea
                placeholder="Enter complete address"
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
              />
            </View>
          </CardContent>
        </Card>
      );
    }

    if (currentStep === 2) {
      return (
        <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden">
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
                <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>
                  How can customers reach you?
                </Text>
              </View>
            </View>
          </CardHeader>
          <CardContent className="p-6">
            {/* Phone */}
            <View className="mb-6">
              <Label>Phone Number</Label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChangeText={(text) => 
                  setFormData({ ...formData, phone: text })
                }
                keyboardType="phone-pad"
              />
            </View>

            {/* Email */}
            <View className="mb-6">
              <Label>Email Address</Label>
              <Input
                placeholder="contact@restaurant.com"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Website */}
            <View className="mb-6">
              <Label>Website</Label>
              <Input
                placeholder="https://yourrestaurant.com"
                value={formData.website}
                onChangeText={(text) =>
                  setFormData({ ...formData, website: text })
                }
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {/* Logo URL */}
            <View className="mb-0">
              <Label>Logo URL</Label>
              <Input
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChangeText={(text) =>
                  setFormData({ ...formData, logo: text })
                }
                keyboardType="url"
                autoCapitalize="none"
              />
              <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
                Optional - Direct link to your restaurant logo
              </Text>
            </View>
          </CardContent>
        </Card>
      );
    }

    if (currentStep === 3) {
      return (
        <Card className="bg-gray-900 border-gray-800 rounded-xl overflow-hidden">
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
                <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>
                  Configure your restaurant settings
                </Text>
              </View>
            </View>
          </CardHeader>
          <CardContent className="p-6">
            {/* Capacity Section */}
            <View style={{ 
              backgroundColor: '#111827', 
              padding: 16, 
              borderRadius: 12, 
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#374151'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <MaterialIcons name="table-restaurant" size={20} color="#dc2626" />
                <Text style={{ color: '#f3f4f6', fontSize: 15, fontWeight: '700', marginLeft: 8 }}>
                  Capacity Information
                </Text>
              </View>

              {/* Table Count Range */}
              <View className="mb-4">
                <Label>Table Count Range</Label>
                <Select
                  value={formData.tableCountRange}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tableCountRange: value as TableCountRange })
                  }
                  placeholder="Select table count range"
                  options={[
                    { label: 'Under 10 tables', value: 'under_10' },
                    { label: '10 to 20 tables', value: '10_to_20' },
                    { label: '20 to 40 tables', value: '20_to_40' },
                    { label: '40 to 50 tables', value: '40_to_50' },
                  ]}
                />
              </View>

              {/* Workers Count */}
              <View className="mb-4">
                <Label>Number of Workers</Label>
                <Input
                  placeholder="e.g., 15"
                  value={formData.workersCount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, workersCount: text })
                  }
                  keyboardType="numeric"
                />
              </View>

              {/* Seating Capacity */}
              <View className="mb-0">
                <Label>Seating Capacity</Label>
                <Input
                  placeholder="e.g., 80"
                  value={formData.seatingCapacity}
                  onChangeText={(text) =>
                    setFormData({ ...formData, seatingCapacity: text })
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Operating Hours */}
            <View className="mb-6">
              <Label>Operating Hours (JSON format)</Label>
              <Textarea
                placeholder='{"monday": "9:00-17:00", "tuesday": "9:00-17:00"}'
                value={formData.operatingHours}
                onChangeText={(text) =>
                  setFormData({ ...formData, operatingHours: text })
                }
              />
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginTop: 6,
                backgroundColor: '#1f2937',
                padding: 8,
                borderRadius: 8
              }}>
                <MaterialIcons name="lightbulb-outline" size={14} color="#6b7280" />
                <Text style={{ color: '#9ca3af', fontSize: 11, marginLeft: 6, flex: 1 }}>
                  Enter as JSON object. Leave empty to configure later
                </Text>
              </View>
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
                    Restaurant will be {formData.isActive ? 'visible' : 'hidden'} to customers
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
      );
    }

    return null;
  };

  const renderButtons = () => {
    if (currentStep === 1) {
      return (
        <View className="mt-6 mb-8">
          <TouchableOpacity
            onPress={handleNext}
            style={{ backgroundColor: '#dc2626', borderRadius: 12, padding: 16, marginBottom: 12 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
              Next Step →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            style={{ padding: 16 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#6b7280', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentStep === 2) {
      return (
        <View className="mt-6 mb-8">
          <TouchableOpacity
            onPress={handleNext}
            style={{ backgroundColor: '#dc2626', borderRadius: 12, padding: 16, marginBottom: 12 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
              Next Step →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBack}
            style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#374151' }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#d1d5db', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
              ← Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            style={{ padding: 16 }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#6b7280', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentStep === 3) {
      return (
        <View className="mt-6 mb-8">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={{ 
              backgroundColor: isSubmitting ? '#991b1b' : '#dc2626', 
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 12,
              opacity: isSubmitting ? 0.7 : 1
            }}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                  Creating...
                </Text>
              </View>
            ) : (
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                Create Restaurant
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBack}
            disabled={isSubmitting}
            style={{ 
              backgroundColor: '#1f2937', 
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 12,
              borderWidth: 2, 
              borderColor: '#374151',
              opacity: isSubmitting ? 0.5 : 1
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#d1d5db', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
              ← Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            disabled={isSubmitting}
            style={{ 
              padding: 16,
              opacity: isSubmitting ? 0.5 : 1
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#6b7280', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Fill in the basic details (Step 1 of 3)';
      case 2:
        return 'Add contact information (Step 2 of 3)';
      case 3:
        return 'Complete operational details (Step 3 of 3)';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        enabled
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: 16, 
            paddingVertical: 24,
            paddingBottom: Platform.OS !== 'web' ? 100 : 24,
            alignItems: 'center',
            flexGrow: 1
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={false}
          scrollEventThrottle={16}
        >
          <View style={{ 
            width: '100%', 
            maxWidth: Platform.OS === 'web' ? 800 : SCREEN_WIDTH - 32
          }}>
            {/* Header */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>
                Add New Restaurant
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                {getStepTitle()}
              </Text>
            </View>

            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Form Content */}
            {renderCurrentStep()}

            {/* Action Buttons */}
            {renderButtons()}
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
            Restaurant created successfully!
          </DialogDescription>
          <DialogFooter style={{ justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => {
                setSuccessDialog(false);
                router.back();
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
    </View>
  );
}
