import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Home() {
  // This screen is only briefly visible while _layout.tsx
  // checks auth state and redirects to /(admin) or /(auth)/sign-in.
  return (
    <View className="flex-1 items-center justify-center bg-slate-900">
      <Stack.Screen options={{ title: 'Home', headerShown: false }} />
      <ActivityIndicator size="large" color="#F97316" />
    </View>
  );
}
