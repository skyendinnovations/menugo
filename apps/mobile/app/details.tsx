import { View, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

export default function Details() {
  const { name } = useLocalSearchParams();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Stack.Screen options={{ title: 'Details' }} />
      <Text className="text-xl font-bold text-black">Showing details for user {name}</Text>
    </View>
  );
}
