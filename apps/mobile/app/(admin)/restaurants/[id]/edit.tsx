import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert as RNAlert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { restaurantAPI } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { useDemoMode } from '@/lib/hooks/useDemoMode';
import { SUPPORTED_CURRENCIES, WORKFLOW_MODES, WORKFLOW_MODE_LABELS } from '@menugo/dto';
import type { WorkflowMode } from '@menugo/dto';
import { MaterialIcons } from '@expo/vector-icons';

export default function EditRestaurant() {
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
  });
  const [demoLoading, setDemoLoading] = useState(false);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('full_service');
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const { isDemoMode, toggleDemoMode, resetDemoData } = useDemoMode(Number(id));

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
        });
        if (r.logo) {
          setSavedLogoUrl(r.logo.startsWith('http') ? r.logo : fileAPI.getFullUrl(r.logo));
        }
        if (r.workflowMode) {
          setWorkflowMode(r.workflowMode as WorkflowMode);
        }
      } catch (err) {
        setError('Failed to load restaurant');
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
        className="flex-1 bg-slate-900">
        <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
          <View className="mb-6 flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">Edit Restaurant</Text>
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

            {/* ── Workflow Mode ── */}
            <View className="mt-2 rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <MaterialIcons name="account-tree" size={20} color="#3B82F6" />
                <Text className="text-base font-bold text-white">Workflow Mode</Text>
              </View>
              <Text className="mb-4 text-sm text-slate-400">
                Controls how orders flow from kitchen to customer.
              </Text>

              <RadioGroup
                value={workflowMode}
                onValueChange={async (value) => {
                  const newMode = value as WorkflowMode;
                  const previous = workflowMode;
                  setWorkflowMode(newMode);
                  setWorkflowLoading(true);
                  try {
                    await restaurantAPI.updateWorkflowMode(Number(id), newMode);
                  } catch (err: any) {
                    setWorkflowMode(previous);
                    RNAlert.alert('Error', err?.message || 'Failed to update workflow mode');
                  } finally {
                    setWorkflowLoading(false);
                  }
                }}>
                {WORKFLOW_MODES.map((mode) => (
                  <View key={mode} className="rounded-xl bg-slate-800 p-3">
                    <RadioGroupItem
                      value={mode}
                      label={WORKFLOW_MODE_LABELS[mode]}
                      disabled={workflowLoading}
                    />
                  </View>
                ))}
              </RadioGroup>

              {workflowLoading && (
                <Text className="mt-2 text-xs text-slate-500">Saving…</Text>
              )}
            </View>

            <Button
              title="Update Restaurant"
              loading={loading}
              onPress={handleUpdate}
              disabled={loading}
              size="lg"
              className="mt-2"
            />

            {/* ── Training / Demo Mode ── */}
            <View className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <MaterialIcons name="school" size={20} color="#F59E0B" />
                <Text className="text-base font-bold text-white">Training Mode</Text>
              </View>
              <Text className="mb-4 text-sm text-slate-400">
                Enable training mode to practise with fake data. Push notifications will be
                suppressed and data can be reset at any time.
              </Text>

              <Switch
                checked={isDemoMode}
                onCheckedChange={async (checked) => {
                  try {
                    await toggleDemoMode(checked);
                  } catch (err: any) {
                    RNAlert.alert('Error', err?.message || 'Failed to toggle training mode');
                  }
                }}
                label={isDemoMode ? 'Training mode is ON' : 'Training mode is OFF'}
              />

              {isDemoMode && (
                <Button
                  title={demoLoading ? 'Resetting…' : 'Reset Demo Data'}
                  variant="danger"
                  size="sm"
                  disabled={demoLoading}
                  onPress={async () => {
                    RNAlert.alert(
                      'Reset Demo Data',
                      'This will clear all orders and sessions, and seed sample data for practice. Continue?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset',
                          style: 'destructive',
                          onPress: async () => {
                            setDemoLoading(true);
                            try {
                              await resetDemoData();
                              RNAlert.alert('Done', 'Demo data has been reset.');
                            } catch (err: any) {
                              RNAlert.alert('Error', err?.message || 'Reset failed');
                            } finally {
                              setDemoLoading(false);
                            }
                          },
                        },
                      ],
                    );
                  }}
                  className="mt-4"
                />
              )}
            </View>
          </View>
          <View className="h-12" />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
