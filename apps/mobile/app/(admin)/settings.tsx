import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MaterialIcons } from '@expo/vector-icons';
import { authAPI } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { AdminPageHeader } from '@/components/AdminPageHeader';

export default function AdminSettings() {
  const router = useRouter();
  const [signOutLoading, setSignOutLoading] = useState(false);

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
          {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSignOutLoading(true);
          try {
            await authAPI.signOut(router);
          } finally {
            setSignOutLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-white">
        <AdminPageHeader
          title="Settings"
          restaurantId={0} // Using 0 since it's a global page
        />

        <View className="flex-1 px-5 pt-4">
          <Card className="mb-4">
            <CardContent>
              <TouchableOpacity
                onPress={() => router.push(ROUTES.ADMIN.PROFILE)}
                className="flex-row items-center justify-between py-2">
                <View className="flex-row items-center gap-4">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <MaterialIcons name="person" size={22} color="#64748B" />
                  </View>
                  <Text className="text-base font-medium text-black">Profile</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#64748B" />
              </TouchableOpacity>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent>
              <TouchableOpacity className="flex-row items-center justify-between py-2">
                <View className="flex-row items-center gap-4">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <MaterialIcons name="notifications" size={22} color="#64748B" />
                  </View>
                  <Text className="text-base font-medium text-black">Notifications</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#64748B" />
              </TouchableOpacity>
            </CardContent>
          </Card>

          <View className="mb-8 mt-auto">
            <Button
              title="Sign Out"
              variant="danger"
              loading={signOutLoading}
              onPress={handleSignOut}
              size="lg"
            />
          </View>
        </View>
      </View>
    </>
  );
}
