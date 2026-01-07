import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function AdminSettings() {
    return (
        <View className="flex-1 items-center justify-center bg-white">
            <Text className="text-2xl font-bold text-gray-800">Admin Settings</Text>
            <Text className="mt-4 text-lg text-gray-600">Manage your settings here</Text>
            <Link href="/(admin)" className="mt-8 rounded bg-blue-500 px-4 py-2 text-white">
                Back to Dashboard
            </Link>
        </View>
    );
}
