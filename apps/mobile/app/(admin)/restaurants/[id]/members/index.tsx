import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type Member } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await memberAPI.getMembers(restaurantId);
      setMembers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  const handleRemove = async (memberId: number) => {
    try {
      await memberAPI.removeMember(restaurantId, memberId);
      fetchMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-white px-5" style={{ paddingTop: insets.top + 12 }}>
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(ROUTES.ADMIN.HOME);
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100 active:opacity-70">
              <MaterialIcons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-black">Members</Text>
          </View>
          <Button
            title="+ Invite"
            size="sm"
            onPress={() => router.push(`/(admin)/restaurants/${id}/members/invite` as any)}
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <Card className="mb-3">
                <CardContent>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-4">
                      <Avatar fallback={item.userName} />
                      <View className="flex-1">
                        <Text className="font-bold text-black">{item.userName}</Text>
                        <Text className="text-sm text-gray-500">{item.userEmail}</Text>
                        <View className="mt-2 flex-row flex-wrap gap-1.5">
                          {item.isOwner && <Badge variant="destructive">Owner</Badge>}
                          {item.roles
                            ?.filter((r) => !(item.isOwner && r.roleName.toLowerCase() === 'owner'))
                            .map((r) => (
                              <Badge key={r.roleId} variant="outline">
                                {r.roleName}
                              </Badge>
                            ))}
                        </View>
                      </View>
                    </View>
                    {!item.isOwner && (
                      <Button
                        title="Remove"
                        size="sm"
                        variant="danger"
                        onPress={() => handleRemove(item.id)}
                      />
                    )}
                  </View>
                </CardContent>
              </Card>
            )}
            ListEmptyComponent={
              <Text className="py-10 text-center text-gray-500">No members yet</Text>
            }
          />
        )}
      </View>
    </>
  );
}
