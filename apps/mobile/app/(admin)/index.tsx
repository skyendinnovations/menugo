import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant, memberAPI, type MyInvitation } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InvitationCard } from '@/components/InvitationCard';
import { useInvitationActions } from '@/lib/hooks/useInvitationActions';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

export default function HomePage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [restaurantRes, invitationRes] = await Promise.all([
        restaurantAPI.getAll(),
        memberAPI.getMyInvitations(),
      ]);
      setRestaurants(restaurantRes.data || []);
      setInvitations(invitationRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
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
        {/* Header — always visible */}
        <View className="mb-5 flex-row items-center justify-end">
          <Button
            title="+ Restaurant"
            size="sm"
            onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.CREATE as any)}
          />
        </View>

        {/* Empty state */}
        {isEmpty && (
          <View className="items-center justify-center px-8 py-12">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-brand/15">
              <MaterialIcons name="restaurant" size={48} color="#F97316" />
            </View>
            <Text className="text-center text-xl font-bold text-white">Welcome to MenuGo!</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
              You don&apos;t have any restaurants yet. Create one or ask a restaurant admin to invite
              you.
            </Text>
          </View>
        )}

        {/* Invitations section */}
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

        {/* Restaurants section */}
        {hasRestaurants && (
          <View className="mb-6">
            <Text className="mb-3 text-lg font-bold text-white">My Restaurants</Text>
            {restaurants.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.detail(item.id) as any)}
                activeOpacity={0.7}
                className="mb-3">
                <Card>
                  <CardContent>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-4">
                        {item.logo ? (
                          <Image
                            source={{
                              uri: item.logo.startsWith('http')
                                ? item.logo
                                : fileAPI.getFullUrl(item.logo),
                            }}
                            className="h-12 w-12 rounded-xl"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand/15">
                            <MaterialIcons name="restaurant" size={24} color="#F97316" />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-base font-bold text-white">{item.name}</Text>
                          {item.description && (
                            <Text className="mt-0.5 text-sm text-slate-400" numberOfLines={1}>
                              {item.description}
                            </Text>
                          )}
                          {item.address && (
                            <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                              {item.address}
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
      </View>
    </ScrollView>
  );
}
