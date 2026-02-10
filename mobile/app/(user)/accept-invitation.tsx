import { View, Text, Alert as RNAlert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-brand/15 items-center justify-center mb-6">
            <MaterialIcons name="mail" size={48} color="#F97316" />
          </View>
          <Text className="text-white text-2xl font-bold">Accept Invitation</Text>
          <Text className="text-slate-400 text-base mt-2 text-center">
            Enter the invitation token you received to join a restaurant.
          </Text>
        </View>

        {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}

        <View className="gap-5">
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
            title="Accept Invitation"
            loading={loading}
            onPress={handleAccept}
            disabled={loading || !token.trim()}
            size="lg"
            className="mt-4"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
