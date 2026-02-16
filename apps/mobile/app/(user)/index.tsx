import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
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

  const { acceptingId, rejectingId, isBusy, handleAccept, handleReject } = useInvitationActions(
    setInvitations,
    { onUpdate: fetchData }
  );

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
      <View className="flex-1 items-center justify-center bg-slate-900">
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
      }>
      <View className="px-5 pt-4">
        {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

        {isEmpty && (
          <View className="items-center justify-center px-8 py-16">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-brand/15">
              <MaterialIcons name="restaurant" size={48} color="#F97316" />
            </View>
            <Text className="text-center text-xl font-bold text-white">Welcome!</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
              You don&apos;t have any restaurants yet. Create one or ask a restaurant admin to
              invite you.
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
            <Text className="mb-3 text-lg font-bold text-white">Pending Invitations</Text>
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
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">My Restaurants</Text>
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
                className="mb-3">
                <Card>
                  <CardContent>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-4">
                        <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand/15">
                          <MaterialIcons name="restaurant" size={24} color="#F97316" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-bold text-white">{item.name}</Text>
                          {item.description && (
                            <Text className="mt-0.5 text-sm text-slate-400" numberOfLines={1}>
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
