import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-900 px-6">
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-slate-800">
        <MaterialIcons name="error-outline" size={40} color="#64748B" />
      </View>
      <Text className="mb-2 text-xl font-bold text-white">Page Not Found</Text>
      <Text className="mb-6 text-center text-slate-400">{"This screen doesn't exist."}</Text>
      <Link href="/">
        <Text className="text-base font-semibold text-brand">Go to home screen</Text>
      </Link>
    </View>
  );
}
