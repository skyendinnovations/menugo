import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, useWindowDimensions, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Label, Textarea, Switch, Card, CardHeader, CardTitle, CardContent, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui';
import { restaurantAPI } from '@/lib/api';

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
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const progressAnim = React.useRef(new Animated.Value(33.33)).current;
  
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
    name: '',
    email: '',
    phone: '',
    website: '',
    workersCount: '',
    seatingCapacity: '',
    operatingHours: '',
  });

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const validateURL = (url: string): boolean => {
    if (!url) return true; // Optional field
    // Check if it has a domain extension like .com, .org, .net, etc.
    const domainRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{2,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)$/;
    return domainRegex.test(url.trim());
  };

  const validateStep1 = () => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      website: '',
      workersCount: '',
      seatingCapacity: '',
      operatingHours: '',
    };

    if (!formData.name.trim()) {
      newErrors.name = 'Restaurant name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
    }

    setErrors(newErrors);

    if (newErrors.name) {
      setErrorMessage(newErrors.name);
      setErrorDialog(true);
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      website: '',
      workersCount: '',
      seatingCapacity: '',
      operatingHours: '',
    };

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (min 10 digits)';
    }

    if (formData.website && !validateURL(formData.website)) {
      newErrors.website = 'Please enter a valid URL with domain (e.g., example.com)';
    }

    if (formData.logo && !validateURL(formData.logo)) {
      newErrors.website = 'Please enter a valid logo URL';
    }

    setErrors(newErrors);

    if (newErrors.email || newErrors.phone || newErrors.website) {
      setErrorMessage(newErrors.email || newErrors.phone || newErrors.website);
      setErrorDialog(true);
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      website: '',
      workersCount: '',
      seatingCapacity: '',
      operatingHours: '',
    };

    if (formData.workersCount) {
      const workers = parseInt(formData.workersCount);
      if (isNaN(workers) || workers < 1 || workers > 1000) {
        newErrors.workersCount = 'Workers count must be between 1 and 1000';
      }
    }

    if (formData.seatingCapacity) {
      const capacity = parseInt(formData.seatingCapacity);
      if (isNaN(capacity) || capacity < 1 || capacity > 10000) {
        newErrors.seatingCapacity = 'Seating capacity must be between 1 and 10000';
      }
    }

    if (formData.operatingHours) {
      try {
        const parsed = JSON.parse(formData.operatingHours);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          newErrors.operatingHours = 'Operating hours must be a valid JSON object';
        }
      } catch (e) {
        newErrors.operatingHours = 'Invalid JSON format for operating hours';
      }
    }

    setErrors(newErrors);

    if (newErrors.workersCount || newErrors.seatingCapacity || newErrors.operatingHours) {
      setErrorMessage(newErrors.workersCount || newErrors.seatingCapacity || newErrors.operatingHours);
      setErrorDialog(true);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      Animated.timing(progressAnim, {
        toValue: 66.66,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      Animated.timing(progressAnim, {
        toValue: 33.33,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else if (currentStep === 3) {
      setCurrentStep(2);
      Animated.timing(progressAnim, {
        toValue: 66.66,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) return;

    // Validate step 3 before submission
    if (!validateStep3()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for backend
      const payload: any = {
        name: formData.name.trim(),
        isActive: formData.isActive,
      };

      // Add optional fields if they have values
      if (formData.description.trim()) payload.description = formData.description.trim();
      if (formData.address.trim()) payload.address = formData.address.trim();
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.website.trim()) payload.website = formData.website.trim();
      if (formData.logo.trim()) payload.logo = formData.logo.trim();
      if (formData.tableCountRange) payload.tableCountRange = formData.tableCountRange;
      if (formData.workersCount.trim()) {
        const workers = parseInt(formData.workersCount);
        if (!isNaN(workers)) payload.workersCount = workers;
      }
      if (formData.seatingCapacity.trim()) {
        const capacity = parseInt(formData.seatingCapacity);
        if (!isNaN(capacity)) payload.seatingCapacity = capacity;
      }
      if (formData.operatingHours.trim()) {
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

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, label: 'Basic Info', icon: 'restaurant' },
      { number: 2, label: 'Contact', icon: 'contact-mail' },
      { number: 3, label: 'Details', icon: 'settings' },
    ];

    return (
      <View style={{ marginBottom: isWeb ? 40 : 32 }}>
        {/* Progress Bar */}
        <View style={{ 
          height: 4, 
          backgroundColor: '#1f2937', 
          borderRadius: 2, 
          marginBottom: 24,
          overflow: 'hidden'
        }}>
          <Animated.View 
            style={{ 
              height: '100%', 
              backgroundColor: '#dc2626',
              borderRadius: 2,
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }} 
          />
        </View>

        {/* Step Indicators */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between',
          paddingHorizontal: isWeb && isLargeScreen ? 40 : 0,
        }}>
          {steps.map((step, index) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            
            return (
              <View key={step.number} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ 
                  width: isWeb && isLargeScreen ? 64 : 56, 
                  height: isWeb && isLargeScreen ? 64 : 56, 
                  borderRadius: isWeb && isLargeScreen ? 32 : 28,
                  backgroundColor: isCompleted ? '#10b981' : isActive ? '#dc2626' : '#1f2937',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isActive ? 3 : 0,
                  borderColor: '#fecaca',
                  ...Platform.select({
                    web: {
                      boxShadow: isActive ? '0 10px 25px rgba(220, 38, 38, 0.3)' : 'none',
                    },
                    default: {
                      elevation: isActive ? 8 : 0,
                      shadowColor: '#dc2626',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isActive ? 0.3 : 0,
                      shadowRadius: 8,
                    }
                  })
                }}>
                  {isCompleted ? (
                    <MaterialIcons name="check-circle" size={isWeb && isLargeScreen ? 32 : 28} color="white" />
                  ) : (
                    <MaterialIcons name={step.icon as any} size={isWeb && isLargeScreen ? 28 : 24} color="white" />
                  )}
                </View>
                <Text style={{ 
                  marginTop: 12,
                  fontSize: isWeb && isLargeScreen ? 14 : 12,
                  fontWeight: isActive || isCompleted ? '700' : '600',
                  color: isCompleted ? '#10b981' : isActive ? '#dc2626' : '#6b7280',
                  textAlign: 'center'
                }}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    const cardStyle = {
      backgroundColor: '#0f172a',
      borderRadius: isWeb && isLargeScreen ? 20 : 16,
      borderWidth: 1,
      borderColor: '#1e293b',
      overflow: 'hidden' as const,
      ...Platform.select({
        web: {
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        },
        default: {
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        }
      })
    };

    if (currentStep === 1) {
      return (
        <View style={cardStyle}>
          <View style={{ 
            padding: isWeb && isLargeScreen ? 32 : 24,
            paddingBottom: isWeb && isLargeScreen ? 28 : 20,
            borderBottomWidth: 1,
            borderBottomColor: '#1e293b',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ 
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#dc2626',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14
              }}>
                <MaterialIcons name="restaurant" size={24} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: isWeb && isLargeScreen ? 22 : 20, 
                  fontWeight: '700', 
                  color: '#ffffff',
                  marginBottom: 4
                }}>
                  Basic Information
                </Text>
                <Text style={{ fontSize: 13, color: '#94a3b8' }}>
                  Tell us about your restaurant
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ padding: isWeb && isLargeScreen ? 32 : 24 }}>
            {/* Restaurant Name */}
            <View style={{ marginBottom: 24 }}>
              <Label required>Restaurant Name</Label>
              <Input
                placeholder="e.g., The Golden Spoon"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  // Instant validation
                  if (!text.trim()) {
                    setErrors({ ...errors, name: 'Restaurant name is required' });
                  } else if (text.trim().length < 3) {
                    setErrors({ ...errors, name: 'Name must be at least 3 characters long' });
                  } else {
                    setErrors({ ...errors, name: '' });
                  }
                }}
                error={!!errors.name}
                maxLength={100}
              />
              {errors.name && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#7f1d1d20', padding: 10, borderRadius: 8 }}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={{ marginLeft: 6, color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 }}>
                    {errors.name}
                  </Text>
                </View>
              )}
              {!errors.name && formData.name.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#05402820', padding: 10, borderRadius: 8 }}>
                  <MaterialIcons name="check-circle" size={16} color="#10b981" />
                  <Text style={{ marginLeft: 6, color: '#10b981', fontSize: 13, fontWeight: '500' }}>
                    Perfect! That's a great name
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={{ marginBottom: 24 }}>
              <Label>Description</Label>
              <Textarea
                placeholder="What makes your restaurant special? Cuisine type, atmosphere, signature dishes..."
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                maxLength={500}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: '#64748b', fontSize: 11 }}>
                  Optional
                </Text>
                <Text style={{ color: formData.description.length > 450 ? '#f59e0b' : '#64748b', fontSize: 11, fontWeight: '600' }}>
                  {formData.description.length}/500
                </Text>
              </View>
            </View>

            {/* Address */}
            <View style={{ marginBottom: 0 }}>
              <Label>Address</Label>
              <Textarea
                placeholder="Street address, city, state, zip code"
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                maxLength={300}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                <Text style={{ color: formData.address.length > 250 ? '#f59e0b' : '#64748b', fontSize: 11, fontWeight: '600' }}>
                  {formData.address.length}/300
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (currentStep === 2) {
      return (
        <View style={cardStyle}>
          <View style={{ 
            padding: isWeb && isLargeScreen ? 32 : 24,
            paddingBottom: isWeb && isLargeScreen ? 28 : 20,
            borderBottomWidth: 1,
            borderBottomColor: '#1e293b',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ 
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#dc2626',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14
              }}>
                <MaterialIcons name="contact-mail" size={24} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: isWeb && isLargeScreen ? 22 : 20, 
                  fontWeight: '700', 
                  color: '#ffffff',
                  marginBottom: 4
                }}>
                  Contact Information
                </Text>
                <Text style={{ fontSize: 13, color: '#94a3b8' }}>
                  How can customers reach you?
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ padding: isWeb && isLargeScreen ? 32 : 24 }}>
            {/* Phone */}
            <View style={{ marginBottom: 24 }}>
              <Label>Phone Number</Label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData({ ...formData, phone: text });
                  // Instant validation
                  if (text && !validatePhone(text)) {
                    setErrors({ ...errors, phone: 'Please enter a valid phone number (min 10 digits)' });
                  } else {
                    setErrors({ ...errors, phone: '' });
                  }
                }}
                keyboardType="phone-pad"
                error={!!errors.phone}
                maxLength={20}
              />
              {errors.phone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#7f1d1d20', padding: 10, borderRadius: 8 }}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={{ marginLeft: 6, color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 }}>
                    {errors.phone}
                  </Text>
                </View>
              )}
            </View>

            {/* Email */}
            <View style={{ marginBottom: 24 }}>
              <Label>Email Address</Label>
              <Input
                placeholder="contact@restaurant.com"
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  // Instant validation
                  if (text && !validateEmail(text)) {
                    setErrors({ ...errors, email: 'Please enter a valid email address' });
                  } else {
                    setErrors({ ...errors, email: '' });
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={!!errors.email}
                maxLength={100}
              />
              {errors.email && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#7f1d1d20', padding: 10, borderRadius: 8 }}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={{ marginLeft: 6, color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 }}>
                    {errors.email}
                  </Text>
                </View>
              )}
            </View>

            {/* Website */}
            <View style={{ marginBottom: 24 }}>
              <Label>Website</Label>
              <Input
                placeholder="yourrestaurant.com"
                value={formData.website}
                onChangeText={(text) => {
                  setFormData({ ...formData, website: text });
                  // Instant validation
                  if (text && !validateURL(text)) {
                    setErrors({ ...errors, website: 'Please enter a valid URL with domain (e.g., example.com)' });
                  } else {
                    setErrors({ ...errors, website: '' });
                  }
                }}
                keyboardType="url"
                autoCapitalize="none"
                error={!!errors.website}
                maxLength={200}
              />
              {errors.website && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#7f1d1d20', padding: 10, borderRadius: 8 }}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={{ marginLeft: 6, color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 }}>
                    {errors.website}
                  </Text>
                </View>
              )}
            </View>

            {/* Logo URL */}
            <View style={{ marginBottom: 0 }}>
              <Label>Logo URL</Label>
              <Input
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChangeText={(text) =>
                  setFormData({ ...formData, logo: text })
                }
                keyboardType="url"
                autoCapitalize="none"
                maxLength={500}
              />
              <Text style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>
                Optional - Direct link to your restaurant logo image
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (currentStep === 3) {
      return (
        <View style={cardStyle}>
          <View style={{ 
            padding: isWeb && isLargeScreen ? 32 : 24,
            paddingBottom: isWeb && isLargeScreen ? 28 : 20,
            borderBottomWidth: 1,
            borderBottomColor: '#1e293b',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ 
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#dc2626',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14
              }}>
                <MaterialIcons name="settings" size={24} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: isWeb && isLargeScreen ? 22 : 20, 
                  fontWeight: '700', 
                  color: '#ffffff',
                  marginBottom: 4
                }}>
                  Operational Details
                </Text>
                <Text style={{ fontSize: 13, color: '#94a3b8' }}>
                  Configure your restaurant settings
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{ padding: isWeb && isLargeScreen ? 32 : 24 }}>
            {/* Capacity Section */}
            <View style={{ 
              backgroundColor: '#1e293b', 
              padding: isWeb && isLargeScreen ? 24 : 20, 
              borderRadius: 16, 
              marginBottom: 24,
              borderWidth: 1,
              borderColor: '#334155'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <MaterialIcons name="table-restaurant" size={22} color="#dc2626" />
                <Text style={{ color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginLeft: 10 }}>
                  Capacity Information
                </Text>
              </View>

              {/* Table Count Range */}
              <View style={{ marginBottom: 18 }}>
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
              <View style={{ marginBottom: 18 }}>
                <Label>Number of Workers</Label>
                <Input
                  placeholder="e.g., 15"
                  value={formData.workersCount}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, workersCount: numericText });
                    if (numericText) {
                      const workers = parseInt(numericText);
                      if (isNaN(workers) || workers < 1 || workers > 1000) {
                        setErrors({ ...errors, workersCount: 'Workers count must be between 1 and 1000' });
                      } else {
                        setErrors({ ...errors, workersCount: '' });
                      }
                    } else {
                      setErrors({ ...errors, workersCount: '' });
                    }
                  }}
                  keyboardType="numeric"
                  error={!!errors.workersCount}
                  maxLength={4}
                />
                {errors.workersCount && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#7f1d1d20', padding: 10, borderRadius: 8 }}>
                    <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                    <Text style={{ marginLeft: 6, color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 }}>
                      {errors.workersCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Seating Capacity */}
              <View style={{ marginBottom: 0 }}>
                <Label>Seating Capacity</Label>
                <Input
                  placeholder="e.g., 80"
                  value={formData.seatingCapacity}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, seatingCapacity: numericText });
                    if (numericText) {
                      const capacity = parseInt(numericText);
                      if (isNaN(capacity) || capacity < 1 || capacity > 10000) {
                        setErrors({ ...errors, seatingCapacity: 'Seating capacity must be between 1 and 10000' });
                      } else {
                        setErrors({ ...errors, seatingCapacity: '' });
                      }
                    } else {
                      setErrors({ ...errors, seatingCapacity: '' });
                    }
                  }}
                  keyboardType="numeric"
                  error={!!errors.seatingCapacity}
                  maxLength={5}
                />
                {errors.seatingCapacity && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#7f1d1d20', padding: 10, borderRadius: 8 }}>
                    <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                    <Text style={{ marginLeft: 6, color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 }}>
                      {errors.seatingCapacity}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Operating Hours */}
            <View style={{ marginBottom: 24 }}>
              <Label>Operating Hours (JSON format)</Label>
              <Textarea
                placeholder='{"monday": "9:00-17:00", "tuesday": "9:00-17:00"}'
                value={formData.operatingHours}
                onChangeText={(text) => {
                  setFormData({ ...formData, operatingHours: text });
                  if (text.trim()) {
                    try {
                      const parsed = JSON.parse(text);
                      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                        setErrors({ ...errors, operatingHours: 'Operating hours must be a valid JSON object' });
                      } else {
                        setErrors({ ...errors, operatingHours: '' });
                      }
                    } catch (e) {
                      setErrors({ ...errors, operatingHours: 'Invalid JSON format' });
                    }
                  } else {
                    setErrors({ ...errors, operatingHours: '' });
                  }
                }}
                error={!!errors.operatingHours}
                maxLength={1000}
              />
              {errors.operatingHours ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#7f1d1d20', padding: 10, borderRadius: 8 }}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={{ marginLeft: 6, color: '#ef4444', fontSize: 13, fontWeight: '500', flex: 1 }}>
                    {errors.operatingHours}
                  </Text>
                </View>
              ) : (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'flex-start', 
                  marginTop: 8,
                  backgroundColor: '#1e293b',
                  padding: 12,
                  borderRadius: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: '#3b82f6'
                }}>
                  <MaterialIcons name="info-outline" size={18} color="#3b82f6" style={{ marginTop: 1 }} />
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 }}>
                    Enter as JSON object. Leave empty to configure later
                  </Text>
                </View>
              )}
            </View>

            {/* Active Status */}
            <View style={{ marginBottom: 0 }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                backgroundColor: '#1e293b', 
                borderRadius: 16, 
                padding: 20,
                borderWidth: 1,
                borderColor: '#334155'
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: formData.isActive ? '#05402820' : '#7f1d1d20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10
                    }}>
                      <MaterialIcons 
                        name="power-settings-new" 
                        size={18} 
                        color={formData.isActive ? '#10b981' : '#ef4444'} 
                      />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#f1f5f9' }}>
                      Active Status
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#94a3b8', marginLeft: 42 }}>
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
          </View>
        </View>
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
            style={{ 
              backgroundColor: '#dc2626', 
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 12,
              shadowColor: '#dc2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                Continue to Contact Details
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            style={{ 
              padding: 16,
              borderRadius: 12,
              backgroundColor: 'transparent'
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#9ca3af', textAlign: 'center', fontWeight: '600', fontSize: 15 }}>
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
            style={{ 
              backgroundColor: '#dc2626', 
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 12,
              shadowColor: '#dc2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                Continue to Details
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBack}
            style={{ 
              backgroundColor: '#1f2937', 
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 12, 
              borderWidth: 2, 
              borderColor: '#374151' 
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="arrow-back" size={20} color="#d1d5db" style={{ marginRight: 8 }} />
              <Text style={{ color: '#d1d5db', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                Back to Basic Info
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            style={{ 
              padding: 16,
              borderRadius: 12,
              backgroundColor: 'transparent'
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#9ca3af', textAlign: 'center', fontWeight: '600', fontSize: 15 }}>
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
              padding: 18, 
              marginBottom: 12,
              opacity: isSubmitting ? 0.7 : 1,
              shadowColor: isSubmitting ? 'transparent' : '#dc2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: isSubmitting ? 0 : 8
            }}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="white" size="small" style={{ marginRight: 10 }} />
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                  Creating Restaurant...
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="check-circle" size={22} color="white" style={{ marginRight: 8 }} />
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                  Create Restaurant
                </Text>
              </View>
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
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="arrow-back" size={20} color="#d1d5db" style={{ marginRight: 8 }} />
              <Text style={{ color: '#d1d5db', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
                Back to Contact
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            disabled={isSubmitting}
            style={{ 
              padding: 16,
              borderRadius: 12,
              backgroundColor: 'transparent',
              opacity: isSubmitting ? 0.5 : 1
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#9ca3af', textAlign: 'center', fontWeight: '600', fontSize: 15 }}>
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
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: isWeb && isLargeScreen ? 40 : 20, 
            paddingVertical: isWeb && isLargeScreen ? 48 : 32,
            paddingBottom: Platform.OS !== 'web' ? 100 : isWeb && isLargeScreen ? 48 : 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ 
            width: '100%', 
            maxWidth: isWeb && isLargeScreen ? 900 : '100%',
            marginHorizontal: 'auto'
          }}>
            {/* Header */}
            <View style={{ marginBottom: isWeb && isLargeScreen ? 40 : 32 }}>
              <Text style={{ 
                fontSize: isWeb && isLargeScreen ? 36 : 28, 
                fontWeight: '800', 
                color: '#ffffff', 
                marginBottom: 10,
                letterSpacing: -0.5
              }}>
                Create New Restaurant
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: isWeb && isLargeScreen ? 16 : 14, lineHeight: 22 }}>
                Let's set up your restaurant profile in just a few steps
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
