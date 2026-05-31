import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#DC2626" />
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
        onRestaurantSelect={(r) => router.push(ROUTES.ADMIN.RESTAURANTS.detail(r) as any)}
        restaurantId={0}
        restaurantName=""
        restaurantLogo={null}
      />

      <View className="flex-1 bg-white">
        {/* ─── Header ─── */}
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-5 pb-4" style={{ paddingTop: insets.top + 12 }}>
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            className="h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
            <MaterialIcons name="menu" size={24} color="#1F2937" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-black">MenuGo</Text>

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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
          }>
          <View className="px-5 pt-5">
            {/* Empty state */}
            {isEmpty && (
              <View className="items-center justify-center px-8 py-16">
                <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-brand-muted">
                  <MaterialIcons name="restaurant" size={48} color="#DC2626" />
                </View>
                <Text className="text-center text-xl font-bold text-black">Welcome to MenuGo!</Text>
                <Text className="mt-2 text-center text-sm leading-5 text-gray-600">
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
                  <MaterialIcons name="mail" size={18} color="#DC2626" />
                  <Text className="text-lg font-bold text-black">Pending Invitations</Text>
                  <View className="rounded-full bg-red-500/20 px-2 py-0.5">
                    <Text className="text-xs font-bold text-red-500">{invitations.length}</Text>
                  </View>
                </View>
                {invitations.map((item) => (
                  <InvitationCard
                    key={item.id}
                    invitation={item}
                    onAccept={() => handleAccept(item)}
                    onReject={() => handleReject(item)}
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
                  <MaterialIcons name="store" size={18} color="#DC2626" />
                  <Text className="text-lg font-bold text-black">My Restaurants</Text>
                </View>
                {restaurants.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.detail(item.id) as any)}
                    activeOpacity={0.7}
                    className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
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
                        <View className="h-14 w-14 items-center justify-center rounded-xl bg-brand-muted">
                          <MaterialIcons name="restaurant" size={28} color="#DC2626" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-bold text-black">{item.name}</Text>
                        {item.description && (
                          <Text className="mt-0.5 text-sm text-gray-500" numberOfLines={1}>
                            {item.description}
                          </Text>
                        )}
                        {item.address && (
                          <View className="mt-1 flex-row items-center gap-1">
                            <MaterialIcons name="place" size={11} color="#9CA3AF" />
                            <Text className="text-xs text-gray-400" numberOfLines={1}>
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
