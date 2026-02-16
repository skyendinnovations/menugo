import { Stack, useRouter } from 'expo-router';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function Home() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-slate-900">
      <Stack.Screen options={{ title: 'Home', headerShown: false }} />
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-brand/15">
          <MaterialIcons name="restaurant-menu" size={48} color="#F97316" />
        </View>
        <Text className="mb-2 text-3xl font-bold text-white">MenuGo</Text>
        <Text className="mb-10 text-center text-base text-slate-400">
          Restaurant management made simple
        </Text>

        <View className="w-full gap-3">
          <Button title="Admin Dashboard" onPress={() => router.push('/(admin)')} size="lg" />
          <Button
            title="Sign Out"
            variant="danger"
            onPress={async () => {
              await authAPI.signOut(router);
            }}
            size="lg"
          />
        </View>
      </View>
    </View>
  );
}
