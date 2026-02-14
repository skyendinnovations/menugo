import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { getSession } from '@/lib/auth-client';
import { fileAPI } from '@/lib/api/file';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { MaterialIcons } from '@expo/vector-icons';

export default function Profile() {
  const router = useRouter();
  const { data: session, isPending } = authAPI.useSession();
  const [manualUser, setManualUser] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getSession();
      setManualUser(res.data?.user || null);
      setChecked(true);
    })();
  }, []);

  // Prefer session user if it has an id, otherwise use manual fallback
  const sessionUser = session?.user as any;
  const user = sessionUser?.id ? sessionUser : manualUser;

  const [name, setName] = useState('');
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      // Fetch current avatar from files API (session cache may be stale)
      fileAPI.getEntityFiles('user', user.id).then((res) => {
        const avatar = (res.data || []).find((f) => f.purpose === 'avatar');
        if (avatar) {
          setSavedAvatarUrl(avatar.url.startsWith('http') ? avatar.url : fileAPI.getFullUrl(avatar.url));
        }
      }).catch(() => {});
    }
  }, [user]);

  const handleImageChange = (uri: string | null) => {
    if (uri) {
      setPendingImageUri(uri);
      setImageRemoved(false);
    } else {
      setPendingImageUri(null);
      setImageRemoved(true);
    }
  };

  const displayImage = pendingImageUri || (imageRemoved ? null : savedAvatarUrl);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authAPI.updateProfile(user.id, { name: name.trim() });

      // Handle image: upload new or delete old
      if (pendingImageUri) {
        try {
          await fileAPI.uploadImage({
            uri: pendingImageUri,
            entityType: 'user',
            entityId: user.id,
            purpose: 'avatar',
          });
        } catch {}
      } else if (imageRemoved && savedAvatarUrl) {
        try {
          const res = await fileAPI.getEntityFiles('user', user.id);
          const match = (res.data || []).find((f) => f.purpose === 'avatar');
          if (match) await fileAPI.deleteFile(match.id);
        } catch {}
      }

      setSuccess('Profile updated');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if ((!checked && isPending) || !user?.id) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

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
            <Text className="text-white text-xl font-bold">Profile</Text>
          </View>

          {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}
          {success ? <Alert variant="default" description={success} className="mb-4" /> : null}

          <View className="gap-5">
            <View className="items-center mb-2">
              <ImageUpload
                value={displayImage}
                onChange={handleImageChange}
                size={110}
                shape="circle"
              />
            </View>

            <View>
              <Label>Email</Label>
              <Input value={user.email || ''} editable={false} />
            </View>

            <View>
              <Label required>Name</Label>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
            </View>

            <Button
              title="Save Changes"
              loading={loading}
              onPress={handleSave}
              disabled={loading}
              size="lg"
              className="mt-2"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
