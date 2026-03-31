import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant, memberAPI } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useRoleRedirect } from '@/lib/hooks/useRoleRedirect';
import { HamburgerMenu } from '@/components/HamburgerMenu';

interface DashboardCard {
  title: string;
  icon: string;
  route: string;
  color: string;
  bg: string;
  permission?: string;
}

const ALL_CARDS: DashboardCard[] = [
  {
    title: 'Kitchen',
    icon: 'soup-kitchen',
    route: 'kitchen',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    permission: 'view_orders',
  },
  {
    title: 'Waiter',
    icon: 'room-service',
    route: 'waiter',
    color: '#06B6D4',
    bg: 'rgba(6,182,212,0.12)',
    permission: 'view_orders',
  },
  {
    title: 'Cashier',
    icon: 'point-of-sale',
    route: 'cashier',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
    permission: 'close_sessions',
  },
  {
    title: 'Orders',
    icon: 'receipt-long',
    route: 'orders',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    permission: 'view_orders',
  },
  {
    title: 'Tables',
    icon: 'table-restaurant',
    route: 'tables',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    permission: 'manage_tables',
  },
  {
    title: 'Menu',
    icon: 'restaurant-menu',
    route: 'menu',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    permission: 'manage_menu',
  },
  {
    title: 'Members',
    icon: 'people',
    route: 'members',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
    permission: 'manage_members',
  },
  {
    title: 'Roles',
    icon: 'admin-panel-settings',
    route: 'roles',
    color: '#F43F5E',
    bg: 'rgba(244,63,94,0.12)',
    permission: 'manage_roles',
  },
  {
    title: 'Notifications',
    icon: 'notifications-active',
    route: 'notification-settings',
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.12)',
    permission: 'manage_restaurant',
  },
  {
    title: 'Subscription',
    icon: 'workspace-premium',
    route: 'subscription',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.12)',
    permission: 'manage_restaurant',
  },
  {
    title: 'Edit',
    icon: 'edit',
    route: 'edit',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.12)',
    permission: 'manage_restaurant',
  },
];

export default function RestaurantDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const restaurantId = Number(id);
  const {
    hasPermission,
    isOwner,
    loading: permLoading,
    permissions,
  } = usePermissions(restaurantId);

  // Auto-redirect based on role (kitchen → kitchen view, waiter → waiter view)
  useRoleRedirect({ restaurantId, enabled: !loading && !permLoading });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setLoading(true);
          const [resRes, allRes] = await Promise.all([
            restaurantAPI.getById(restaurantId),
            restaurantAPI.getAll(),
          ]);
          setRestaurant(resRes.data);
          setAllRestaurants(allRes.data || []);
        } catch (error) {
          console.error('Failed to fetch restaurant:', error);
        } finally {
          setLoading(false);
        }
      })();
    }, [restaurantId])
  );

  const cards = useMemo(
    () => ALL_CARDS.filter((card) => !card.permission || isOwner || hasPermission(card.permission)),
    [isOwner, hasPermission]
  );

  if (loading || permLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <HamburgerMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        restaurantId={restaurantId}
        restaurantName={restaurant?.name}
        restaurantLogo={restaurant?.logo}
        permissions={permissions}
        isOwner={isOwner}
        restaurants={allRestaurants}
        onRestaurantSelect={(r) => {
          router.push(ROUTES.ADMIN.RESTAURANTS.detail(r.id) as any);
        }}
      />

      <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ─── Header ─── */}
        <View className="flex-row items-center gap-3 border-b border-slate-800 px-5 pb-5 pt-14">
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
          </TouchableOpacity>

          {/* Restaurant info */}
          <View className="flex-1 flex-row items-center gap-3">
            {restaurant?.logo ? (
              <Image
                source={{
                  uri: restaurant.logo.startsWith('http')
                    ? restaurant.logo
                    : fileAPI.getFullUrl(restaurant.logo),
                }}
                className="h-10 w-10 rounded-xl"
                resizeMode="cover"
              />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
                <MaterialIcons name="restaurant" size={20} color="#F97316" />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-lg font-bold text-white" numberOfLines={1}>
                {restaurant?.name}
              </Text>
              {restaurant?.description && (
                <Text className="text-xs text-slate-500" numberOfLines={1}>
                  {restaurant.description}
                </Text>
              )}
            </View>
          </View>

          {/* Hamburger */}
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            className="h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="menu" size={24} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* ─── Quick actions section label ─── */}
        <View className="px-5 pb-3 pt-6">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Access
          </Text>
        </View>

        {/* ─── Grid of cards ─── */}
        <View className="px-4">
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.route}
                onPress={() =>
                  router.push(ROUTES.ADMIN.RESTAURANTS.subpage(id!, card.route) as any)
                }
                activeOpacity={0.7}
                style={{ width: '47%' }}>
                <View
                  className="items-center rounded-2xl border border-slate-700 bg-slate-800 px-3 py-7"
                  style={{
                    shadowColor: card.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 2,
                  }}>
                  <View
                    className="mb-3 h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: card.bg }}>
                    <MaterialIcons name={card.icon as any} size={28} color={card.color} />
                  </View>
                  <Text className="text-sm font-bold text-white">{card.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
