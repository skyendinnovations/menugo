import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { menuAPI, kitchenAPI, type MenuCategory, type Kitchen } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { ImageUpload } from '@/components/ui/ImageUpload';
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
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);

  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    isVeg: false,
    hasVariants: false,
    kitchenId: '',
  });
  const [variants, setVariants] = useState<VariantInput[]>([]);

  // Image state
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const restaurantId = Number(id);
  const isEdit = !!itemId;

  useEffect(() => {
    (async () => {
      try {
        const [catRes, kitchenRes] = await Promise.all([menuAPI.getCategories(restaurantId), kitchenAPI.list(restaurantId)]);
        setCategories(catRes.data || []);
        setKitchens(kitchenRes.data || []);

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
            kitchenId: item.kitchenId ? String(item.kitchenId) : '',
          });
          if (item.imagePath) {
            setSavedImageUrl(
              item.imagePath.startsWith('http')
                ? item.imagePath
                : fileAPI.getFullUrl(item.imagePath)
            );
          }
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

  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));

  const updateVariant = (idx: number, field: keyof VariantInput, value: string) => {
    const updated = [...variants];
    updated[idx][field] = value;
    setVariants(updated);
  };

  const handleImageChange = (uri: string | null) => {
    if (uri) {
      setPendingImageUri(uri);
      setImageRemoved(false);
    } else {
      setPendingImageUri(null);
      setImageRemoved(true);
    }
  };

  const displayImage = pendingImageUri || (imageRemoved ? null : savedImageUrl);

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

    const effectivePrice = form.hasVariants
      ? String(Math.min(...validVariants.map((v) => parseFloat(v.price) || 0)))
      : form.price;

    setLoading(true);
    setError('');
    try {
      let targetItemId = itemId;

      if (isEdit) {
        await menuAPI.updateItem(restaurantId, Number(itemId), {
          categoryId: Number(form.categoryId),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: effectivePrice,
          isVeg: form.isVeg,
          hasVariants: form.hasVariants,
          kitchenId: form.kitchenId ? Number(form.kitchenId) : null,
          variants: form.hasVariants ? validVariants : undefined,
        } as any);
      } else {
        const createRes = await menuAPI.createItem(restaurantId, {
          categoryId: Number(form.categoryId),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: effectivePrice,
          isVeg: form.isVeg,
          hasVariants: form.hasVariants,
          kitchenId: form.kitchenId ? Number(form.kitchenId) : null,
          variants: form.hasVariants ? validVariants : undefined,
        });
        targetItemId = String(createRes.data?.id);
      }

      // Handle image: upload new or delete old
      if (pendingImageUri && targetItemId) {
        try {
          await fileAPI.uploadImage({
            uri: pendingImageUri,
            entityType: 'menu_item',
            entityId: String(targetItemId),
            purpose: 'image',
          });
        } catch {}
      } else if (imageRemoved && savedImageUrl && targetItemId) {
        try {
          const res = await fileAPI.getEntityFiles('menu_item', String(targetItemId));
          const match = (res.data || []).find((f) => f.purpose === 'image');
          if (match) await fileAPI.deleteFile(match.id);
        } catch {}
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
        className="flex-1 bg-slate-900">
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



            <View>
              <Label>Kitchen (Optional)</Label>
              <Select
                value={form.kitchenId}
                onValueChange={(kitchenId) => setForm((p) => ({ ...p, kitchenId }))}
                options={kitchens.map((k) => ({ label: k.name, value: String(k.id) }))}
                placeholder="No specific kitchen"
              />
            </View>

            <View className="items-center">
              <Label>Image</Label>
              <ImageUpload
                value={displayImage}
                onChange={handleImageChange}
                size={120}
                shape="square"
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
                <View className="mb-3 flex-row items-center justify-between">
                  <Label>Variants</Label>
                  <TouchableOpacity
                    onPress={addVariant}
                    className="h-9 w-9 items-center justify-center rounded-lg bg-brand/15">
                    <MaterialIcons name="add" size={22} color="#F97316" />
                  </TouchableOpacity>
                </View>
                {variants.map((v, idx) => (
                  <View key={idx} className="mb-3 flex-row items-center gap-2">
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
