import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { menuAPI, type MenuCategory } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { MaterialIcons } from '@expo/vector-icons';

interface VariantInput {
  name: string;
  price: string;
}

export default function ItemForm() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);

  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    isVeg: false,
    hasVariants: false,
  });
  const [variants, setVariants] = useState<VariantInput[]>([]);

  const restaurantId = Number(id);
  const isEdit = !!itemId;

  useEffect(() => {
    (async () => {
      try {
        const catRes = await menuAPI.getCategories(restaurantId);
        setCategories(catRes.data || []);

        if (isEdit) {
          const itemRes = await menuAPI.getItem(restaurantId, Number(itemId));
          const item = itemRes.data;
          setForm({
            categoryId: String(item.categoryId),
            name: item.name,
            description: item.description || '',
            price: item.price,
            isVeg: item.isVeg ?? false,
            hasVariants: item.hasVariants ?? false,
          });
          if (item.variants) {
            setVariants(item.variants.map((v) => ({ name: v.name, price: v.price })));
          }
        }
      } catch (err) {
        setError('Failed to load data');
      }
    })();
  }, [restaurantId, itemId, isEdit]);

  const addVariant = () => setVariants([...variants, { name: '', price: '' }]);

  const removeVariant = (idx: number) =>
    setVariants(variants.filter((_, i) => i !== idx));

  const updateVariant = (idx: number, field: keyof VariantInput, value: string) => {
    const updated = [...variants];
    updated[idx][field] = value;
    setVariants(updated);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price || !form.categoryId) {
      setError('Name, price, and category are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await menuAPI.updateItem(restaurantId, Number(itemId), {
          categoryId: Number(form.categoryId),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: form.price,
          isVeg: form.isVeg,
          hasVariants: form.hasVariants,
        } as any);
      } else {
        await menuAPI.createItem(restaurantId, {
          categoryId: Number(form.categoryId),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: form.price,
          isVeg: form.isVeg,
          hasVariants: form.hasVariants,
          variants: variants.filter((v) => v.name && v.price),
        });
      }
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? 'Edit Item' : 'Add Item' }} />
      <ScrollView className="flex-1 bg-black p-4">
        {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}
        <View className="gap-4">
          <View>
            <Label required>Category</Label>
            <Select
              value={form.categoryId}
              onValueChange={(categoryId) => setForm((p) => ({ ...p, categoryId }))}
              options={categories.map((c) => ({
                label: c.name,
                value: String(c.id),
              }))}
              placeholder="Select category"
            />
          </View>

          <View>
            <Label required>Item Name</Label>
            <Input
              value={form.name}
              onChangeText={(name) => setForm((p) => ({ ...p, name }))}
              placeholder="e.g. Margherita Pizza"
            />
          </View>

          <View>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChangeText={(description) => setForm((p) => ({ ...p, description }))}
              placeholder="Item description"
            />
          </View>

          <View>
            <Label required>Price</Label>
            <Input
              value={form.price}
              onChangeText={(price) => setForm((p) => ({ ...p, price }))}
              placeholder="9.99"
              keyboardType="decimal-pad"
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Label>Vegetarian</Label>
            <Switch
              checked={form.isVeg}
              onCheckedChange={(isVeg) => setForm((p) => ({ ...p, isVeg }))}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Label>Has Variants</Label>
            <Switch
              checked={form.hasVariants}
              onCheckedChange={(hasVariants) => setForm((p) => ({ ...p, hasVariants }))}
            />
          </View>

          {form.hasVariants && (
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Label>Variants</Label>
                <TouchableOpacity onPress={addVariant}>
                  <MaterialIcons name="add-circle" size={24} color="#dc2626" />
                </TouchableOpacity>
              </View>
              {variants.map((v, idx) => (
                <View key={idx} className="flex-row gap-2 mb-2 items-center">
                  <Input
                    value={v.name}
                    onChangeText={(val) => updateVariant(idx, 'name', val)}
                    placeholder="Size"
                    className="flex-1"
                  />
                  <Input
                    value={v.price}
                    onChangeText={(val) => updateVariant(idx, 'price', val)}
                    placeholder="Price"
                    keyboardType="decimal-pad"
                    className="w-24"
                  />
                  <TouchableOpacity onPress={() => removeVariant(idx)}>
                    <MaterialIcons name="remove-circle" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Button
            title={loading ? 'Saving...' : isEdit ? 'Update Item' : 'Create Item'}
            onPress={handleSubmit}
            disabled={loading}
            className="bg-red-600 mt-4"
          />
        </View>
      </ScrollView>
    </>
  );
}
