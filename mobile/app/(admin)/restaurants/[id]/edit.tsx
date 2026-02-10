import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { restaurantAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { MaterialIcons } from '@expo/vector-icons';

export default function EditRestaurant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await restaurantAPI.getById(Number(id));
        const r = res.data;
        setForm({
          name: r.name || '',
          description: r.description || '',
          address: r.address || '',
          phone: r.phone || '',
          email: r.email || '',
        });
      } catch (err) {
        setError('Failed to load restaurant');
      }
    })();
  }, [id]);

  const handleUpdate = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await restaurantAPI.update(Number(id), {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-slate-900"
      >
        <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-4 mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Edit Restaurant</Text>
          </View>
          {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}
          <View className="gap-5">
            <View>
              <Label required>Name</Label>
              <Input
                value={form.name}
                onChangeText={(name) => setForm((p) => ({ ...p, name }))}
                placeholder="Restaurant name"
              />
            </View>
            <View>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChangeText={(description) => setForm((p) => ({ ...p, description }))}
                placeholder="Description"
              />
            </View>
            <View>
              <Label>Address</Label>
              <Input
                value={form.address}
                onChangeText={(address) => setForm((p) => ({ ...p, address }))}
                placeholder="Address"
              />
            </View>
            <View>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
                placeholder="Phone"
              />
            </View>
            <View>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChangeText={(email) => setForm((p) => ({ ...p, email }))}
                placeholder="Email"
              />
            </View>
            <Button
              title="Update Restaurant"
              loading={loading}
              onPress={handleUpdate}
              disabled={loading}
              size="lg"
              className="mt-2 mb-8"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
