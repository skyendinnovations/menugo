import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant, memberAPI, type MyInvitation } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InvitationCard } from '@/components/InvitationCard';
import { useInvitationActions } from '@/lib/hooks/useInvitationActions';
import { HamburgerMenu } from '@/components/HamburgerMenu';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

export default function HomePage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hamburger drawer (no active restaurant at this level) */}
      <HamburgerMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        restaurants={restaurants}
        onRestaurantSelect={(r) => router.push(ROUTES.ADMIN.RESTAURANTS.detail(r.id) as any)}
      />

      <View className="flex-1 bg-slate-900">
        {/* ─── Header ─── */}
        <View className="flex-row items-center justify-between border-b border-slate-800 bg-slate-900 px-5 pb-4 pt-14">
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            className="h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="menu" size={24} color="#F8FAFC" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-white">MenuGo</Text>

          <Button
            title="+ New"
            size="sm"
            onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.CREATE as any)}
          />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
          }>
          <View className="px-5 pt-5">
            {/* Empty state */}
            {isEmpty && (
              <View className="items-center justify-center px-8 py-16">
                <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-brand/15">
                  <MaterialIcons name="restaurant" size={48} color="#F97316" />
                </View>
                <Text className="text-center text-xl font-bold text-white">Welcome to MenuGo!</Text>
                <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
                  You don't have any restaurants yet. Create one or ask a restaurant admin to invite
                  you.
                </Text>
                <Button
                  title="Create Restaurant"
                  className="mt-6"
                  onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.CREATE as any)}
                />
              </View>
            )}

            {/* Pending invitations */}
            {hasInvitations && (
              <View className="mb-6">
                <View className="mb-3 flex-row items-center gap-2">
                  <MaterialIcons name="mail" size={18} color="#8B5CF6" />
                  <Text className="text-lg font-bold text-white">Pending Invitations</Text>
                  <View className="rounded-full bg-purple-500/20 px-2 py-0.5">
                    <Text className="text-xs font-bold text-purple-400">{invitations.length}</Text>
                  </View>
                </View>
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

            {/* Restaurants */}
            {hasRestaurants && (
              <View className="mb-6">
                <View className="mb-3 flex-row items-center gap-2">
                  <MaterialIcons name="store" size={18} color="#F97316" />
                  <Text className="text-lg font-bold text-white">My Restaurants</Text>
                </View>
                {restaurants.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.detail(item.id) as any)}
                    activeOpacity={0.7}
                    className="mb-3 rounded-2xl border border-slate-700 bg-slate-800 p-4">
                    <View className="flex-row items-center gap-4">
                      {item.logo ? (
                        <Image
                          source={{
                            uri: item.logo.startsWith('http')
                              ? item.logo
                              : fileAPI.getFullUrl(item.logo),
                          }}
                          className="h-14 w-14 rounded-xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-14 w-14 items-center justify-center rounded-xl bg-brand/15">
                          <MaterialIcons name="restaurant" size={28} color="#F97316" />
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
                          <View className="mt-1 flex-row items-center gap-1">
                            <MaterialIcons name="place" size={11} color="#64748B" />
                            <Text className="text-xs text-slate-500" numberOfLines={1}>
                              {item.address}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="items-end gap-2">
                        <Badge variant={item.isActive ? 'success' : 'destructive'}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <MaterialIcons name="chevron-right" size={20} color="#475569" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
