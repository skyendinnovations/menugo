import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { restaurantAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { SUPPORTED_CURRENCIES } from '@/lib/utils/currency';

export default function CreateRestaurant() {
  const router = useRouter();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900"
    >
      <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
        <Text className="text-white text-2xl font-bold mb-6">Create Restaurant</Text>
        {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}
        <View className="gap-5">
          <View>
            <Label required>Restaurant Name</Label>
            <Input
              value={form.name}
              onChangeText={(name) => setForm((p) => ({ ...p, name }))}
              placeholder="Enter restaurant name"
            />
          </View>
          <View>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChangeText={(description) => setForm((p) => ({ ...p, description }))}
              placeholder="Brief description"
            />
          </View>
          <View>
            <Label>Address</Label>
            <Input
              value={form.address}
              onChangeText={(address) => setForm((p) => ({ ...p, address }))}
              placeholder="Restaurant address"
            />
          </View>
          <View>
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
          </View>
          <View>
            <Label>Email</Label>
            <Input
              value={form.email}
              onChangeText={(email) => setForm((p) => ({ ...p, email }))}
              placeholder="Contact email"
              keyboardType="email-address"
            />
          </View>
          <View>
            <Label>Currency</Label>
            <Select
              value={form.currency}
              onValueChange={(currency) => setForm((p) => ({ ...p, currency }))}
              options={SUPPORTED_CURRENCIES}
              placeholder="Select currency"
            />
          </View>
          <View>
            <Label>Table Count Range</Label>
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
            />
          </View>
          <Button
            title="Create Restaurant"
            loading={loading}
            onPress={handleCreate}
            disabled={loading}
            size="lg"
            className="mt-2 mb-8"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
