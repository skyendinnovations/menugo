import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-slate-900 justify-center items-center px-6">
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
      <View className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center mb-6">
        <MaterialIcons name="error-outline" size={40} color="#64748B" />
      </View>
      <Text className="text-white text-xl font-bold mb-2">Page Not Found</Text>
      <Text className="text-slate-400 text-center mb-6">
        {"This screen doesn't exist."}
      </Text>
      <Link href="/">
        <Text className="text-brand font-semibold text-base">Go to home screen</Text>
      </Link>
    </View>
  );
}
