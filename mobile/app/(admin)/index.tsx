import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function AdminDashboard() {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <Text className="text-2xl font-bold text-gray-800">Admin Dashboard</Text>
            <Text className="text-lg text-gray-600 mt-4">Welcome to the admin panel</Text>
            <Link href="/(admin)/settings" className="mt-8 px-4 py-2 bg-blue-500 rounded text-white">
                Go to Settings
            </Link>
        </View>
    );
}