import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

export default function AdminSettings() {
  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Text className="text-2xl font-bold text-white">Admin Settings</Text>
      <Text className="mt-4 text-lg text-gray-400">Manage your settings here</Text>
      <Link href="/(admin)" asChild>
        <TouchableOpacity className="mt-8 rounded bg-red-600 px-4 py-2">
          <Text className="font-semibold text-white">Back to Dashboard</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
