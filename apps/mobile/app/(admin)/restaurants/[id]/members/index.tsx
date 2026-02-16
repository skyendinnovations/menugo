import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type Member } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MaterialIcons } from '@expo/vector-icons';

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
      <View className="flex-1 bg-slate-900 px-5 pt-4">
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">Members</Text>
          </View>
          <Button
            title="+ Invite"
            size="sm"
            onPress={() => router.push(`/(admin)/restaurants/${id}/members/invite` as any)}
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
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
                        <Text className="font-bold text-white">{item.userName}</Text>
                        <Text className="text-sm text-slate-400">{item.userEmail}</Text>
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
              <Text className="py-10 text-center text-slate-500">No members yet</Text>
            }
          />
        )}
      </View>
    </>
  );
}
