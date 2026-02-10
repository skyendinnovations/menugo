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
      <View className="flex-1 justify-center items-center px-6">
        <View className="w-24 h-24 rounded-full bg-brand/15 items-center justify-center mb-6">
          <MaterialIcons name="restaurant-menu" size={48} color="#F97316" />
        </View>
        <Text className="text-white text-3xl font-bold mb-2">MenuGo</Text>
        <Text className="text-slate-400 text-base text-center mb-10">
          Restaurant management made simple
        </Text>

        <View className="w-full gap-3">
          <Button
            title="Admin Dashboard"
            onPress={() => router.push('/(admin)')}
            size="lg"
          />
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
