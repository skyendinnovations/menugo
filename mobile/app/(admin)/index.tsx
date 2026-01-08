import { View, Text } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { authAPI } from '@/lib/api';
import { useState } from 'react';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await authAPI.signOut(router);
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-white">
            <Text className="text-2xl font-bold text-gray-800">Admin Dashboard</Text>
            <Text className="text-lg text-gray-600 mt-4">Welcome to the admin panel</Text>

            <View className="mt-8 gap-4">
                <Link href="/(admin)/settings" asChild>
                    <Button title="Go to Settings" />
                </Link>

                <Button
                    title={loading ? "Signing Out..." : "Sign Out"}
                    onPress={handleSignOut}
                    disabled={loading}
                    className="bg-red-500"
                />
            </View>
        </View>
    );
}