import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant, memberAPI, type MyInvitation, authAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { InvitationCard } from '@/components/InvitationCard';
import { useInvitationActions } from '@/lib/hooks/useInvitationActions';
import { MaterialIcons } from '@expo/vector-icons';

export default function UserHomePage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [signOutLoading, setSignOutLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const [restaurantRes, invitationRes] = await Promise.all([
        restaurantAPI.getAll(),
        memberAPI.getMyInvitations(),
      ]);
      setRestaurants(restaurantRes.data || []);
      setInvitations(invitationRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const { acceptingId, rejectingId, isBusy, handleAccept, handleReject } =
    useInvitationActions(setInvitations, { onUpdate: fetchData });

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await authAPI.signOut(router);
    } finally {
      setSignOutLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  const hasRestaurants = restaurants.length > 0;
  const hasInvitations = invitations.length > 0;
  const isEmpty = !hasRestaurants && !hasInvitations;

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
    >
      <View className="px-5 pt-4">
        {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

        {isEmpty && (
          <View className="items-center justify-center py-16 px-8">
            <View className="w-24 h-24 rounded-full bg-brand/15 items-center justify-center mb-6">
              <MaterialIcons name="restaurant" size={48} color="#F97316" />
            </View>
            <Text className="text-white text-xl font-bold text-center">Welcome!</Text>
            <Text className="text-slate-400 text-sm text-center mt-2 leading-5">
              You don't have any restaurants yet. Create one or ask a restaurant admin to invite you.
            </Text>
            <Button
              title="Create Restaurant"
              size="lg"
              onPress={() => router.push('/(admin)/restaurants/create' as any)}
              className="mt-6 w-full"
            />
          </View>
        )}

        {hasInvitations && (
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-3">Pending Invitations</Text>
            {invitations.map((item) => (
              <InvitationCard
                key={item.id}
                invitation={item}
                onAccept={handleAccept}
                onReject={handleReject}
                isAccepting={acceptingId === item.id}
                isRejecting={rejectingId === item.id}
                disabled={isBusy}
              />
            ))}
          </View>
        )}

        {hasRestaurants && (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-lg font-bold">My Restaurants</Text>
              <Button
                title="+ New"
                size="sm"
                variant="ghost"
                onPress={() => router.push('/(admin)/restaurants/create' as any)}
              />
            </View>
            {restaurants.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(`/(admin)/restaurants/${item.id}` as any)}
                activeOpacity={0.7}
                className="mb-3"
              >
                <Card>
                  <CardContent>
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center gap-4 flex-1">
                        <View className="w-12 h-12 rounded-xl bg-brand/15 items-center justify-center">
                          <MaterialIcons name="restaurant" size={24} color="#F97316" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-base font-bold">{item.name}</Text>
                          {item.description && (
                            <Text className="text-slate-400 text-sm mt-0.5" numberOfLines={1}>
                              {item.description}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Badge variant={item.isActive ? 'success' : 'destructive'}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <MaterialIcons name="chevron-right" size={22} color="#64748B" />
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="mt-4">
          <Button
            title="Sign Out"
            variant="danger"
            loading={signOutLoading}
            onPress={handleSignOut}
            size="lg"
          />
        </View>
      </View>
    </ScrollView>
  );
}
