import { View, Text, Alert as RNAlert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { memberAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { MaterialIcons } from '@expo/vector-icons';

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setError('Please enter an invitation token');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await memberAPI.acceptInvitation(trimmed);
      RNAlert.alert(
        'Invitation Accepted',
        'You have successfully joined the restaurant.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(user)'),
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. The token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black p-4">
      <View className="flex-1 justify-center px-2">
        <View className="items-center mb-8">
          <MaterialIcons name="mail" size={64} color="#dc2626" />
          <Text className="text-white text-2xl font-bold mt-4">Accept Invitation</Text>
          <Text className="text-gray-400 text-sm mt-2 text-center">
            Enter the invitation token you received to join a restaurant.
          </Text>
        </View>

        {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

        <View className="gap-4">
          <View>
            <Label required>Invitation Token</Label>
            <Input
              value={token}
              onChangeText={setToken}
              placeholder="Paste your invitation token"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Button
            title={loading ? 'Accepting...' : 'Accept Invitation'}
            onPress={handleAccept}
            disabled={loading || !token.trim()}
            className="bg-red-600 mt-4"
          />
        </View>
      </View>
    </View>
  );
}
