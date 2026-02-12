import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
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
    if (!form.name.trim() || !form.categoryId) {
      setError('Name and category are required');
      return;
    }

    const validVariants = variants.filter((v) => v.name.trim() && v.price);

    if (form.hasVariants) {
      if (validVariants.length === 0) {
        setError('Add at least one variant with name and price');
        return;
      }
    } else if (!form.price) {
      setError('Price is required');
      return;
    }

    // Auto-set base price to lowest variant price when hasVariants is on
    const effectivePrice = form.hasVariants
      ? String(Math.min(...validVariants.map((v) => parseFloat(v.price) || 0)))
      : form.price;

    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await menuAPI.updateItem(restaurantId, Number(itemId), {
          categoryId: Number(form.categoryId),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: effectivePrice,
          isVeg: form.isVeg,
          hasVariants: form.hasVariants,
          variants: form.hasVariants ? validVariants : undefined,
        } as any);
      } else {
        await menuAPI.createItem(restaurantId, {
          categoryId: Number(form.categoryId),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: effectivePrice,
          isVeg: form.isVeg,
          hasVariants: form.hasVariants,
          variants: form.hasVariants ? validVariants : undefined,
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-slate-900"
      >
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}
          <View className="gap-5">
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

            {!form.hasVariants && (
              <View>
                <Label required>Price</Label>
                <Input
                  value={form.price}
                  onChangeText={(price) => setForm((p) => ({ ...p, price }))}
                  placeholder="9.99"
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            <View className="flex-row items-center justify-between py-2">
              <Label>Vegetarian</Label>
              <Switch
                checked={form.isVeg}
                onCheckedChange={(isVeg) => setForm((p) => ({ ...p, isVeg }))}
              />
            </View>

            <View className="flex-row items-center justify-between py-2">
              <Label>Has Variants</Label>
              <Switch
                checked={form.hasVariants}
                onCheckedChange={(hasVariants) => setForm((p) => ({ ...p, hasVariants }))}
              />
            </View>

            {form.hasVariants && (
              <View>
                <View className="flex-row justify-between items-center mb-3">
                  <Label>Variants</Label>
                  <TouchableOpacity
                    onPress={addVariant}
                    className="w-9 h-9 rounded-lg bg-brand/15 items-center justify-center"
                  >
                    <MaterialIcons name="add" size={22} color="#F97316" />
                  </TouchableOpacity>
                </View>
                {variants.map((v, idx) => (
                  <View key={idx} className="flex-row gap-2 mb-3 items-center">
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
                      <MaterialIcons name="remove-circle" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Button
              title={isEdit ? 'Update Item' : 'Create Item'}
              loading={loading}
              onPress={handleSubmit}
              disabled={loading}
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
