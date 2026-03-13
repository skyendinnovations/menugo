import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import type { PlatformStats, AdminRestaurantListItem, AdminUserListItem } from '@menugo/dto';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MaterialIcons } from '@expo/vector-icons';

type TabKey = 'overview' | 'restaurants' | 'users';

export default function SuperAdminScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [restaurants, setRestaurants] = useState<AdminRestaurantListItem[]>([]);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res.data);
      setAuthorized(true);
    } catch (err: any) {
      if (err?.response?.status === 403 || err?.status === 403) {
        setAuthorized(false);
      } else {
        console.error('Failed to fetch admin stats:', err);
        setAuthorized(false);
      }
    }
  }, []);

  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await adminAPI.getRestaurants();
      setRestaurants(res.data || []);
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchRestaurants(), fetchUsers()]);
    setLoading(false);
  }, [fetchStats, fetchRestaurants, fetchUsers]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll().finally(() => setRefreshing(false));
  }, [fetchAll]);

  // ── Restaurant actions ──

  const handleSuspendRestaurant = (restaurant: AdminRestaurantListItem) => {
    Alert.alert(
      'Suspend Restaurant',
      `Are you sure you want to suspend "${restaurant.name}"? It will be hidden from customers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(`restaurant-${restaurant.id}`);
            try {
              await adminAPI.suspendRestaurant(restaurant.id, 'Suspended by admin');
              setRestaurants((prev) =>
                prev.map((r) =>
                  r.id === restaurant.id ? { ...r, isActive: false } : r
                )
              );
              fetchStats();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to suspend restaurant');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleActivateRestaurant = async (restaurant: AdminRestaurantListItem) => {
    setActionLoading(`restaurant-${restaurant.id}`);
    try {
      await adminAPI.activateRestaurant(restaurant.id);
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurant.id ? { ...r, isActive: true } : r))
      );
      fetchStats();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to activate restaurant');
    } finally {
      setActionLoading(null);
    }
  };

  // ── User actions ──

  const handleBanUser = (user: AdminUserListItem) => {
    Alert.alert(
      'Ban User',
      `Are you sure you want to ban "${user.name || user.email}"? They will lose access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(`user-${user.id}`);
            try {
              await adminAPI.banUser(user.id, 'Banned by admin');
              setUsers((prev) =>
                prev.map((u) =>
                  u.id === user.id ? { ...u, banned: true } : u
                )
              );
              fetchStats();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to ban user');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleUnbanUser = async (user: AdminUserListItem) => {
    setActionLoading(`user-${user.id}`);
    try {
      await adminAPI.unbanUser(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, banned: false } : u))
      );
      fetchStats();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to unban user');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Authorization check ──

  if (authorized === null || loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center bg-slate-900">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </>
    );
  }

  if (authorized === false) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center bg-slate-900 px-8">
          <MaterialIcons name="admin-panel-settings" size={64} color="#EF4444" />
          <Text className="mt-4 text-center text-xl font-bold text-white">
            Access Denied
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-400">
            You do not have super admin privileges to access this panel.
          </Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            className="mt-6"
            size="lg"
          />
        </View>
      </>
    );
  }

  // ── Tab navigation ──

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'restaurants', label: 'Restaurants', icon: 'restaurant' },
    { key: 'users', label: 'Users', icon: 'people' },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-900">
        {/* Header */}
        <View className="flex-row items-center gap-4 px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">Super Admin</Text>
            <Text className="text-xs text-slate-400">Platform Management</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-slate-800 px-5">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 items-center py-3 ${
                activeTab === tab.key ? 'border-b-2 border-brand' : ''
              }`}>
              <MaterialIcons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? '#F97316' : '#64748B'}
              />
              <Text
                className={`mt-1 text-xs font-medium ${
                  activeTab === tab.key ? 'text-brand' : 'text-slate-500'
                }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
          }>
          {/* ── Overview Tab ── */}
          {activeTab === 'overview' && stats && (
            <View>
              <Text className="mb-4 text-lg font-bold text-white">Platform Stats</Text>
              <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                <StatCard
                  title="Restaurants"
                  value={stats.totalRestaurants}
                  icon="restaurant"
                  color="#3B82F6"
                  bg="rgba(59,130,246,0.12)"
                />
                <StatCard
                  title="Active"
                  value={stats.activeRestaurants}
                  icon="check-circle"
                  color="#22C55E"
                  bg="rgba(34,197,94,0.12)"
                />
                <StatCard
                  title="Suspended"
                  value={stats.suspendedRestaurants}
                  icon="pause-circle-filled"
                  color="#EF4444"
                  bg="rgba(239,68,68,0.12)"
                />
                <StatCard
                  title="Users"
                  value={stats.totalUsers}
                  icon="people"
                  color="#8B5CF6"
                  bg="rgba(139,92,246,0.12)"
                />
                <StatCard
                  title="Banned"
                  value={stats.bannedUsers}
                  icon="block"
                  color="#F43F5E"
                  bg="rgba(244,63,94,0.12)"
                />
                <StatCard
                  title="Orders"
                  value={stats.totalOrders}
                  icon="receipt-long"
                  color="#F59E0B"
                  bg="rgba(245,158,11,0.12)"
                />
              </View>
            </View>
          )}

          {/* ── Restaurants Tab ── */}
          {activeTab === 'restaurants' && (
            <View>
              <Text className="mb-4 text-lg font-bold text-white">
                All Restaurants ({restaurants.length})
              </Text>
              {restaurants.map((restaurant) => {
                const isActioning = actionLoading === `restaurant-${restaurant.id}`;
                return (
                  <Card key={restaurant.id} className="mb-3">
                    <CardContent>
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-bold text-white">
                              {restaurant.name}
                            </Text>
                            <Badge
                              variant={restaurant.isActive ? 'success' : 'destructive'}>
                              {restaurant.isActive ? 'Active' : 'Suspended'}
                            </Badge>
                          </View>
                          {restaurant.email && (
                            <Text className="mt-1 text-xs text-slate-400">
                              {restaurant.email}
                            </Text>
                          )}
                          <View className="mt-2 flex-row gap-3">
                            <Text className="text-xs text-slate-500">
                              {restaurant.memberCount ?? 0} members
                            </Text>
                            <Text className="text-xs text-slate-500">
                              {restaurant.tableCount ?? 0} tables
                            </Text>
                            <Text className="text-xs text-slate-500">
                              {restaurant.orderCount ?? 0} orders
                            </Text>
                          </View>
                        </View>

                        {isActioning ? (
                          <ActivityIndicator size="small" color="#F97316" />
                        ) : restaurant.isActive ? (
                          <TouchableOpacity
                            onPress={() => handleSuspendRestaurant(restaurant)}
                            className="rounded-lg bg-red-600/20 px-3 py-2">
                            <Text className="text-xs font-bold text-red-400">Suspend</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleActivateRestaurant(restaurant)}
                            className="rounded-lg bg-green-600/20 px-3 py-2">
                            <Text className="text-xs font-bold text-green-400">
                              Activate
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </CardContent>
                  </Card>
                );
              })}
              {restaurants.length === 0 && (
                <View className="items-center py-16">
                  <MaterialIcons name="restaurant" size={48} color="#64748B" />
                  <Text className="mt-4 text-slate-500">No restaurants found.</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Users Tab ── */}
          {activeTab === 'users' && (
            <View>
              <Text className="mb-4 text-lg font-bold text-white">
                All Users ({users.length})
              </Text>
              {users.map((user) => {
                const isActioning = actionLoading === `user-${user.id}`;
                return (
                  <Card key={user.id} className="mb-3">
                    <CardContent>
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-bold text-white">
                              {user.name || 'Unknown'}
                            </Text>
                            {user.isSuperAdmin && (
                              <Badge variant="default">Super Admin</Badge>
                            )}
                            {user.banned && (
                              <Badge variant="destructive">Banned</Badge>
                            )}
                          </View>
                          <Text className="mt-1 text-xs text-slate-400">
                            {user.email}
                          </Text>
                          <View className="mt-2 flex-row gap-3">
                            <Text className="text-xs text-slate-500">
                              {user.restaurantCount ?? 0} restaurants
                            </Text>
                            {user.createdAt && (
                              <Text className="text-xs text-slate-500">
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                        </View>

                        {!user.isSuperAdmin && (
                          <>
                            {isActioning ? (
                              <ActivityIndicator size="small" color="#F97316" />
                            ) : user.banned ? (
                              <TouchableOpacity
                                onPress={() => handleUnbanUser(user)}
                                className="rounded-lg bg-green-600/20 px-3 py-2">
                                <Text className="text-xs font-bold text-green-400">
                                  Unban
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                onPress={() => handleBanUser(user)}
                                className="rounded-lg bg-red-600/20 px-3 py-2">
                                <Text className="text-xs font-bold text-red-400">
                                  Ban
                                </Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </View>
                    </CardContent>
                  </Card>
                );
              })}
              {users.length === 0 && (
                <View className="items-center py-16">
                  <MaterialIcons name="people" size={48} color="#64748B" />
                  <Text className="mt-4 text-slate-500">No users found.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

// ── Stat Card Component ──

function StatCard({
  title,
  value,
  icon,
  color,
  bg,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={{ width: '47%' }}>
      <Card>
        <CardContent className="items-center py-5">
          <View
            className="mb-2 h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: bg }}>
            <MaterialIcons name={icon as any} size={24} color={color} />
          </View>
          <Text className="text-2xl font-bold text-white">{value}</Text>
          <Text className="mt-1 text-xs text-slate-400">{title}</Text>
        </CardContent>
      </Card>
    </View>
  );
}
