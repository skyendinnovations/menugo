import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { publicAPI } from '@/lib/api';
import { getDeviceId } from '@/lib/utils/device-id';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

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
        // Navigate to the session - we need the restaurant slug and table number
        // For now, show success. In a real app, the session data would include routing info.
        setError(''); // Clear errors
        router.back();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-black p-4 pt-12">
      <Text className="text-white text-2xl font-bold mb-2">Join a Table</Text>
      <Text className="text-gray-400 mb-6">
        Enter the 4-digit code shown on your table's screen
      </Text>

      {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

      <View className="gap-4">
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
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />
        </View>

        <Button
          title={loading ? 'Joining...' : 'Join Table'}
          onPress={handleJoin}
          disabled={loading}
          className="bg-red-600 mt-4"
        />
      </View>
    </ScrollView>
  );
}
