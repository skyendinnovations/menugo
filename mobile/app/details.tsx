import { View, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

export default function Details() {
  const { name } = useLocalSearchParams();

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center px-6">
      <Stack.Screen options={{ title: 'Details' }} />
      <Text className="text-white text-xl font-bold">
        Showing details for user {name}
      </Text>
    </View>
  );
}
