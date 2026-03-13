import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Redirect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { getRoleLandingPage } from '@/lib/utils/role-routing';

/* ── Theme tokens ─────────────────────────────────────────────── */
const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const GRAY_900 = '#111827';
const GRAY_700 = '#374151';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const GRAY_50 = '#F9FAFB';
const WHITE = '#FFFFFF';

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
  const { hasPermission, isOwner, membership, loading: permLoading } = usePermissions(restaurantId);

  // Auto-redirect single-role users to their dedicated page
  const roleLandingPage = useMemo(() => {
    if (!membership) return null;
    return getRoleLandingPage(membership, id!);
  }, [membership, id]);

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
      bg: '#EFF6FF',
      permission: 'manage_tables',
    },
    {
      title: 'Menu',
      icon: 'restaurant-menu',
      route: 'menu',
      color: '#10B981',
      bg: '#ECFDF5',
      permission: 'manage_menu',
    },
    {
      title: 'Orders',
      icon: 'receipt-long',
      route: 'orders',
      color: '#F59E0B',
      bg: '#FFFBEB',
      permission: 'view_orders',
    },
    {
      title: 'Members',
      icon: 'people',
      route: 'members',
      color: '#8B5CF6',
      bg: '#F5F3FF',
      permission: 'manage_members',
    },
    {
      title: 'Kitchen',
      icon: 'soup-kitchen',
      route: 'staff',
      color: '#EF4444',
      bg: '#FEF2F2',
      permission: 'order_prepare',
    },
    {
      title: 'Waiter',
      icon: 'room-service',
      route: 'staff',
      color: '#06B6D4',
      bg: '#ECFEFF',
      permission: 'order_deliver',
    },
    {
      title: 'Cashier',
      icon: 'point-of-sale',
      route: 'staff',
      color: '#22C55E',
      bg: '#F0FDF4',
      permission: 'close_sessions',
    },
    {
      title: 'Roles',
      icon: 'admin-panel-settings',
      route: 'roles',
      color: '#F43F5E',
      bg: '#FFF1F2',
      permission: 'manage_roles',
    },
    {
      title: 'Notifications',
      icon: 'notifications-active',
      route: 'notification-settings',
      color: '#F59E0B',
      bg: '#FFFBEB',
      permission: 'manage_restaurant',
    },
    {
      title: 'Subscription',
      icon: 'workspace-premium',
      route: 'subscription',
      color: '#F97316',
      bg: '#FFF7ED',
      permission: 'manage_restaurant',
    },
    {
      title: 'Edit',
      icon: 'edit',
      route: 'edit',
      color: '#64748B',
      bg: '#F8FAFC',
      permission: 'manage_restaurant',
    },
    {
      title: 'Permissions',
      icon: 'security',
      route: 'permissions',
      color: '#A855F7',
      bg: '#FAF5FF',
      permission: 'manage_roles',
    },
    {
      title: 'Helper',
      icon: 'cleaning-services',
      route: 'staff',
      color: '#14B8A6',
      bg: '#F0FDFA',
      permission: 'helper_block_table',
    },
    {
      title: 'Audit Logs',
      icon: 'history',
      route: 'audit-logs',
      color: '#64748B',
      bg: '#F8FAFC',
      permission: 'view_audit_log',
    },
    {
      title: 'Order Flow',
      icon: 'account-tree',
      route: 'roles',
      color: '#3B82F6',
      bg: '#EFF6FF',
      permission: 'manage_workflows',
    },
    {
      title: 'Stock',
      icon: 'inventory',
      route: 'stock',
      color: '#10B981',
      bg: '#ECFDF5',
      permission: 'manage_stock',
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE }}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  // Single-role user → redirect to their dedicated page (e.g. waiter, kitchen)
  if (roleLandingPage) {
    return <Redirect href={roleLandingPage as any} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: WHITE }}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center' }}>
          {/* Header */}
          {restaurant && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: GRAY_200,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: GRAY_200,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: WHITE,
                  }}>
                  <Ionicons name="arrow-back" size={20} color={GRAY_700} />
                </TouchableOpacity>
                {restaurant.logo ? (
                  <Image
                    source={{
                      uri: restaurant.logo.startsWith('http')
                        ? restaurant.logo
                        : fileAPI.getFullUrl(restaurant.logo),
                    }}
                    style={{ width: 48, height: 48, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: GRAY_900 }}>{restaurant.name}</Text>
                  {restaurant.description ? (
                    <Text style={{ fontSize: 14, color: GRAY_500, marginTop: 2 }}>{restaurant.description}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          {/* Section Label */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: GRAY_500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Management
            </Text>
          </View>

          {/* Cards Grid */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              paddingHorizontal: 14,
              gap: 10,
            }}>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.route}
                onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.subpage(id!, card.route) as any)}
                activeOpacity={0.7}
                style={{
                  width: '47%',
                  flexGrow: 1,
                  backgroundColor: WHITE,
                  borderWidth: 1.5,
                  borderColor: GRAY_200,
                  borderRadius: 16,
                  paddingVertical: 24,
                  alignItems: 'center',
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
                    android: { elevation: 1 },
                    default: { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as any,
                  }),
                }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: card.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                  <MaterialIcons name={card.icon as any} size={28} color={card.color} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: GRAY_900 }}>{card.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
