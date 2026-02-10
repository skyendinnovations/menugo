import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function UserHomePage() {
  const router = useRouter();
  const [signOutLoading, setSignOutLoading] = useState(false);

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await authAPI.signOut(router);
    } finally {
      setSignOutLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black p-4">
      <View className="flex-1 justify-center items-center px-6">
        <MaterialIcons name="person" size={64} color="#dc2626" />
        <Text className="text-white text-2xl font-bold mt-4">Welcome!</Text>
        <Text className="text-gray-400 text-sm mt-2 text-center">
          Accept an invitation to join a restaurant and start working.
        </Text>

        <Button
          title="Accept Invitation"
          onPress={() => router.push('/(user)/accept-invitation' as any)}
          className="bg-red-600 mt-8 w-full"
        />
      </View>

      <View className="mt-4">
        <Button
          title={signOutLoading ? 'Signing Out...' : 'Sign Out'}
          onPress={handleSignOut}
          disabled={signOutLoading}
          className="bg-gray-800"
        />
      </View>
    </View>
  );
}
