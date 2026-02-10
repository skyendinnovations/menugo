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
    <View className="flex-1 bg-slate-900 px-6">
      <View className="flex-1 justify-center items-center">
        <View className="w-24 h-24 rounded-full bg-brand/15 items-center justify-center mb-6">
          <MaterialIcons name="person" size={48} color="#F97316" />
        </View>
        <Text className="text-white text-2xl font-bold">Welcome!</Text>
        <Text className="text-slate-400 text-base mt-3 text-center leading-6">
          Accept an invitation to join a restaurant and start working.
        </Text>
        <Button
          title="Accept Invitation"
          onPress={() => router.push('/(user)/accept-invitation' as any)}
          size="lg"
          className="mt-8 w-full"
        />
      </View>

      <View className="mb-8">
        <Button
          title="Sign Out"
          variant="danger"
          loading={signOutLoading}
          onPress={handleSignOut}
          size="lg"
        />
      </View>
    </View>
  );
}
