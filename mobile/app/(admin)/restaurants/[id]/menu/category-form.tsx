import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import { menuAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export default function CategoryForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');

  const restaurantId = Number(id);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await menuAPI.createCategory(restaurantId, name.trim(), Number(displayOrder) || 0);
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Category' }} />
      <ScrollView className="flex-1 bg-black p-4">
        {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}
        <View className="gap-4">
          <View>
            <Label required>Category Name</Label>
            <Input value={name} onChangeText={setName} placeholder="e.g. Appetizers" />
          </View>
          <View>
            <Label>Display Order</Label>
            <Input
              value={displayOrder}
              onChangeText={setDisplayOrder}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <Button
            title={loading ? 'Creating...' : 'Create Category'}
            onPress={handleSubmit}
            disabled={loading}
            className="bg-red-600"
          />
        </View>
      </ScrollView>
    </>
  );
}
