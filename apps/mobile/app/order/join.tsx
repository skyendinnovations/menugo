import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { publicAPI } from '@/lib/api';
import { getDeviceId } from '@/lib/utils/device-id';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { MaterialIcons } from '@expo/vector-icons';

export default function JoinSession() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!joinCode.trim() || joinCode.length !== 4) {
      setError('Please enter a valid 4-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const deviceId = await getDeviceId();
      const result = await publicAPI.joinSession(
        joinCode.trim(),
        deviceId,
        name.trim() || undefined
      );

      if (result.data?.session) {
        setError('');
        router.back();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        <View className="mb-8 items-center">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-brand/15">
            <MaterialIcons name="qr-code-scanner" size={48} color="#F97316" />
          </View>
          <Text className="text-2xl font-bold text-white">Join a Table</Text>
          <Text className="mt-2 text-center text-base text-slate-400">
            Enter the 4-digit code shown on your table
          </Text>
        </View>

        {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}

        <View className="gap-5">
          <View>
            <Label required>Join Code</Label>
            <Input
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="1234"
              keyboardType="numeric"
              maxLength={4}
              className="text-center text-2xl tracking-widest"
            />
          </View>

          <View>
            <Label>Your Name (optional)</Label>
            <Input value={name} onChangeText={setName} placeholder="Enter your name" />
          </View>

          <Button
            title="Join Table"
            loading={loading}
            onPress={handleJoin}
            disabled={loading}
            size="lg"
            className="mt-4"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
