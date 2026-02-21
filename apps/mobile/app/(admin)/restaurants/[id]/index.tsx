import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { Card, CardContent } from '@/components/ui/Card';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface DashboardCard {
  title: string;
  icon: string;
  route: string;
  color: string;
  bg: string;
  permission?: string;
}

export default function RestaurantDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const restaurantId = Number(id);
  const { hasPermission, isOwner, loading: permLoading } = usePermissions(restaurantId);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setLoading(true);
          const res = await restaurantAPI.getById(restaurantId);
          setRestaurant(res.data);
        } catch (error) {
          console.error('Failed to fetch restaurant:', error);
        } finally {
          setLoading(false);
        }
      })();
    }, [restaurantId])
  );

  const allCards: DashboardCard[] = [
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
      title: 'Orders',
      icon: 'receipt-long',
      route: 'orders',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.12)',
      permission: 'view_orders',
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
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.12)',
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

  const cards = useMemo(
    () =>
      allCards.filter(
        (card) => !card.permission || isOwner || hasPermission(card.permission)
      ),
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
      <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ padding: 20 }}>
        {restaurant && (
          <View className="mb-6">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                onPress={() => router.back()}
                className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
                <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
              </TouchableOpacity>
              {restaurant.logo ? (
                <Image
                  source={{
                    uri: restaurant.logo.startsWith('http')
                      ? restaurant.logo
                      : fileAPI.getFullUrl(restaurant.logo),
                  }}
                  className="h-12 w-12 rounded-xl"
                  resizeMode="cover"
                />
              ) : null}
              <View className="flex-1">
                <Text className="text-2xl font-bold text-white">{restaurant.name}</Text>
                {restaurant.description && (
                  <Text className="mt-1 text-sm text-slate-400">{restaurant.description}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.route}
              onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.subpage(id!, card.route) as any)}
              activeOpacity={0.7}
              style={{ width: '48%' }}>
              <Card>
                <CardContent className="items-center py-7">
                  <View
                    className="mb-3 h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: card.bg }}>
                    <MaterialIcons name={card.icon as any} size={28} color={card.color} />
                  </View>
                  <Text className="text-base font-semibold text-white">{card.title}</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
