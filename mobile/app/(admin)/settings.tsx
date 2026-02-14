import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MaterialIcons } from '@expo/vector-icons';
import { authAPI } from '@/lib/api';

export default function AdminSettings() {
  const router = useRouter();
  const [signOutLoading, setSignOutLoading] = useState(false);

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await authAPI.signOut(router);
    } finally {
      setSignOutLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 px-5 pt-4">
      <Card className="mb-4">
        <CardContent>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/profile')}
            className="flex-row items-center justify-between py-2"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-10 h-10 rounded-xl bg-slate-700 items-center justify-center">
                <MaterialIcons name="person" size={22} color="#94A3B8" />
              </View>
              <Text className="text-white text-base font-medium">Profile</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#64748B" />
          </TouchableOpacity>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent>
          <TouchableOpacity className="flex-row items-center justify-between py-2">
            <View className="flex-row items-center gap-4">
              <View className="w-10 h-10 rounded-xl bg-slate-700 items-center justify-center">
                <MaterialIcons name="notifications" size={22} color="#94A3B8" />
              </View>
              <Text className="text-white text-base font-medium">Notifications</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#64748B" />
          </TouchableOpacity>
        </CardContent>
      </Card>

      <View className="mt-auto mb-8">
        <Button
          title="Sign Out"
          variant="danger"
          loading={signOutLoading}
          onPress={handleSignOut}
          size="lg"
        />
      </View>
    </View>
  );
}
