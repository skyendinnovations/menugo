import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type Member } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
      <Stack.Screen options={{ title: 'Members' }} />
      <View className="flex-1 bg-black p-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-xl font-bold">Members</Text>
          <Button
            title="+ Invite"
            onPress={() => router.push(`/(admin)/restaurants/${id}/members/invite` as any)}
            className="bg-red-600 rounded-lg px-4 py-2"
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#dc2626" />
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Card className="mb-3">
                <CardContent>
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="text-white font-bold">{item.userName}</Text>
                      <Text className="text-gray-400 text-sm">{item.userEmail}</Text>
                      <View className="flex-row gap-1 mt-2 flex-wrap">
                        {item.isOwner && <Badge variant="destructive">Owner</Badge>}
                        {item.roles?.map((r) => (
                          <Badge key={r.roleId} variant="outline">
                            {r.roleName}
                          </Badge>
                        ))}
                      </View>
                    </View>
                    {!item.isOwner && (
                      <Button
                        title="Remove"
                        onPress={() => handleRemove(item.id)}
                        className="bg-gray-700 px-3 py-1"
                      />
                    )}
                  </View>
                </CardContent>
              </Card>
            )}
            ListEmptyComponent={
              <Text className="text-gray-500 text-center py-8">No members yet</Text>
            }
          />
        )}
      </View>
    </>
  );
}
