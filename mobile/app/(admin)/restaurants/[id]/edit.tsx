import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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
      <ScrollView className="flex-1 bg-black p-4">
        <View className="flex-row items-center gap-3 mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Edit Restaurant</Text>
        </View>

        {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

        <View className="gap-4">
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
            title={loading ? 'Updating...' : 'Update Restaurant'}
            onPress={handleUpdate}
            disabled={loading}
            className="bg-red-600 mt-4"
          />
        </View>
      </ScrollView>
    </>
  );
}
