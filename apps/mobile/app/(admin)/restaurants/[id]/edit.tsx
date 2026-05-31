import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { ROUTES } from '@/lib/routes';
import { restaurantAPI } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { SUPPORTED_CURRENCIES } from '@menugo/dto';
import { MaterialIcons } from '@expo/vector-icons';

export default function EditRestaurant() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Track the saved image URL (from API) and the user's pending pick
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    currency: 'INR',
    tableCountRange: '',
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
          currency: r.currency || 'INR',
          tableCountRange: r.tableCountRange || '',
        });
        if (r.logo) {
          setSavedLogoUrl(r.logo.startsWith('http') ? r.logo : fileAPI.getFullUrl(r.logo));
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load restaurant');
      }
    })();
  }, [id]);

  const handleImageChange = (uri: string | null) => {
    if (uri) {
      setPendingImageUri(uri);
      setImageRemoved(false);
    } else {
      setPendingImageUri(null);
      setImageRemoved(true);
    }
  };

  // What to display: pending pick > saved URL (unless removed)
  const displayImage = pendingImageUri || (imageRemoved ? null : savedLogoUrl);

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
        currency: form.currency,
        tableCountRange: form.tableCountRange || undefined,
      });

      // Handle image: upload new or delete old
      if (pendingImageUri) {
        await fileAPI.uploadImage({
          uri: pendingImageUri,
          entityType: 'restaurant',
          entityId: String(id),
          purpose: 'logo',
        });
      } else if (imageRemoved && savedLogoUrl) {
        try {
          const res = await fileAPI.getEntityFiles('restaurant', String(id));
          const match = (res.data || []).find((f) => f.purpose === 'logo');
          if (match) await fileAPI.deleteFile(match.id);
        } catch {}
      }

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
        className="flex-1 bg-white">
        <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12 }}>
          <View className="mb-6 flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(ROUTES.ADMIN.HOME);
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100 active:opacity-70">
              <MaterialIcons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-black">Edit Restaurant</Text>
          </View>
          {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}
          <View className="gap-5">
            <View className="mb-2 items-center">
              <Label>Logo</Label>
              <ImageUpload
                value={displayImage}
                onChange={handleImageChange}
                size={100}
                shape="circle"
              />
            </View>
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
              title="Update Restaurant"
              loading={loading}
              onPress={handleUpdate}
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
