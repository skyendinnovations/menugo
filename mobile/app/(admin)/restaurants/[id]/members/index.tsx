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

  useFocusEffect(useCallback(() => { fetchMembers(); }, [fetchMembers]));

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
        <View className="flex-row justify-between items-center mb-5">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Members</Text>
          </View>
          <Button
            title="+ Invite"
            size="sm"
            onPress={() => router.push(`/(admin)/restaurants/${id}/members/invite` as any)}
          />
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
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
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-4 flex-1">
                      <Avatar fallback={item.userName} />
                      <View className="flex-1">
                        <Text className="text-white font-bold">{item.userName}</Text>
                        <Text className="text-slate-400 text-sm">{item.userEmail}</Text>
                        <View className="flex-row gap-1.5 mt-2 flex-wrap">
                          {item.isOwner && <Badge variant="destructive">Owner</Badge>}
                          {item.roles
                            ?.filter((r) => !(item.isOwner && r.roleName.toLowerCase() === 'owner'))
                            .map((r) => (
                              <Badge key={r.roleId} variant="outline">{r.roleName}</Badge>
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
              <Text className="text-slate-500 text-center py-10">No members yet</Text>
            }
          />
        )}
      </View>
    </>
  );
}
