import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { useSession } from '@/lib/api/auth';
import { getSession } from '@/lib/auth-client';
import { fileAPI } from '@/lib/api/file';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { MaterialIcons } from '@expo/vector-icons';
import { AdminPageHeader } from '@/components/AdminPageHeader';

export default function Profile() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
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
      fileAPI
        .getEntityFiles('user', user.id)
        .then((res) => {
          const avatar = (res.data || []).find((f) => f.purpose === 'avatar');
          if (avatar) {
            setSavedAvatarUrl(
              avatar.url.startsWith('http') ? avatar.url : fileAPI.getFullUrl(avatar.url)
            );
          }
        })
        .catch(() => {});
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
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-white">
        <AdminPageHeader title="Profile" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <ScrollView className="flex-1 px-5 pt-4" keyboardShouldPersistTaps="handled">
            {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}
          {success ? <Alert variant="default" description={success} className="mb-4" /> : null}

          <View className="gap-5">
            <View className="mb-2 items-center">
              <ImageUpload
                value={displayImage}
                onChange={handleImageChange}
                size={110}
                shape="circle"
              />
            </View>

            <View>
              <Label className="text-gray-600">Email</Label>
              <Input variant="light" value={user.email || ''} editable={false} />
            </View>

            <View>
              <Label required className="text-gray-600">Name</Label>
              <Input variant="light" value={name} onChangeText={setName} placeholder="Your name" />
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
      </View>
    </>
  );
}
