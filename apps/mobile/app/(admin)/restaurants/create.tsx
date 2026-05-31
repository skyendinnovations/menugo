import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { restaurantAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { SUPPORTED_CURRENCIES } from '@menugo/dto';

export default function CreateRestaurant() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    currency: 'INR',
    tableCountRange: '',
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Restaurant name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await restaurantAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        currency: form.currency,
        tableCountRange: form.tableCountRange || undefined,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white">
        <View className="flex-row items-center gap-3 border-b border-gray-200 px-5 pb-4" style={{ paddingTop: insets.top + 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100 active:opacity-70">
            <MaterialIcons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-black">Create Restaurant</Text>
            <Text className="text-sm text-gray-600">Set up the basic details for your restaurant.</Text>
          </View>
        </View>
        <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
        {error ? <Alert variant="destructive" theme="light" description={error} className="mb-5" /> : null}
        <View className="gap-5">
          <View>
            <Label required variant="light">
              Restaurant Name
            </Label>
            <Input
              value={form.name}
              onChangeText={(name) => setForm((p) => ({ ...p, name }))}
              placeholder="Enter restaurant name"
              variant="light"
            />
          </View>
          <View>
            <Label variant="light">Description</Label>
            <Textarea
              value={form.description}
              onChangeText={(description) => setForm((p) => ({ ...p, description }))}
              placeholder="Brief description"
              variant="light"
            />
          </View>
          <View>
            <Label variant="light">Address</Label>
            <Input
              value={form.address}
              onChangeText={(address) => setForm((p) => ({ ...p, address }))}
              placeholder="Restaurant address"
              variant="light"
            />
          </View>
          <View>
            <Label variant="light">Phone</Label>
            <Input
              value={form.phone}
              onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
              placeholder="Phone number"
              keyboardType="phone-pad"
              variant="light"
            />
          </View>
          <View>
            <Label variant="light">Email</Label>
            <Input
              value={form.email}
              onChangeText={(email) => setForm((p) => ({ ...p, email }))}
              placeholder="Contact email"
              keyboardType="email-address"
              variant="light"
            />
          </View>
          <View>
            <Label variant="light">Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(currency) => setForm((p) => ({ ...p, currency }))}
              options={SUPPORTED_CURRENCIES}
              placeholder="Select currency"
              variant="light"
            />
          </View>
          <View>
            <Label variant="light">Table Count Range</Label>
            <Select
              value={form.tableCountRange}
              onValueChange={(tableCountRange) => setForm((p) => ({ ...p, tableCountRange }))}
              options={[
                { label: 'Under 10', value: 'under_10' },
                { label: '10 to 20', value: '10_to_20' },
                { label: '20 to 40', value: '20_to_40' },
                { label: '40 to 50', value: '40_to_50' },
              ]}
              placeholder="Select range"
              variant="light"
            />
          </View>
          <Button
            title="Create Restaurant"
            loading={loading}
            onPress={handleCreate}
            disabled={loading}
            size="lg"
            className="mb-8 mt-2"
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
