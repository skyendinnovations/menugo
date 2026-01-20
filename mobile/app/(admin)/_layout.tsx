import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  StatusBar,
  useWindowDimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, Link, useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar, Select } from '@/components/ui';
import { authAPI, restaurantAPI, Restaurant } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: session, isPending: isLoadingUser } = useAuth();
  const user = session?.user;
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await restaurantAPI.getRestaurants();
        if (response && response.data && response.data.length > 0) {
          setRestaurants(response.data);
          setSelectedRestaurantId(response.data[0].id.toString());
        } else {
          if (!pathname.includes('new')) {
            router.replace('/(admin)/restaurants/new');
          }
        }
      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    try {
      await authAPI.signOut(router);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const menuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/(admin)' },
    { label: 'Restaurants', icon: 'store', route: '/(admin)/restaurants' },
    { label: 'Settings', icon: 'settings', route: '/(admin)/settings' },
  ];

  const isActiveRoute = (route: string) => {
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

    if (route === '/(admin)') {
      return normalizedPath === '/' || normalizedPath === '/(admin)';
    }
    const routeWithoutGroup = route.replace('/(admin)', '');
    return (
      normalizedPath.startsWith(route) ||
      normalizedPath.startsWith(routeWithoutGroup) ||
      normalizedPath === route ||
      normalizedPath === routeWithoutGroup
    );
  };

  const Sidebar = () => (
    <View className="h-full border-r border-gray-800 bg-gray-900">
      <View className="border-b border-gray-800 p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-white">MenuGo</Text>
            <Text className="mt-0.5 text-xs text-gray-400">Admin Portal</Text>
          </View>
          {!isWeb && (
            <TouchableOpacity
              onPress={() => setIsSidebarOpen(false)}
              className="rounded-lg bg-gray-800 p-2 active:bg-gray-700">
              <MaterialIcons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {menuItems.map((item, index) => {
          const isActive = isActiveRoute(item.route);
          return (
            <Link key={index} href={item.route as any} asChild>
              <TouchableOpacity
                className={`mb-2 flex-row items-center rounded-lg p-4 ${
                  isActive ? 'border-l-4 border-red-600 bg-red-900/20' : 'active:bg-gray-800'
                }`}
                onPress={() => setIsSidebarOpen(false)}>
                <MaterialIcons
                  name={item.icon as any}
                  size={24}
                  color={isActive ? '#DC2626' : '#9CA3AF'}
                />
                <Text
                  className={`ml-4 text-base font-medium ${isActive ? 'text-red-500' : 'text-gray-300'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            </Link>
          );
        })}
      </ScrollView>

      <View className="border-t border-gray-800 p-4">
        <TouchableOpacity
          onPress={handleSignOut}
          className="flex-row items-center rounded-lg p-4 active:bg-gray-800">
          <MaterialIcons name="logout" size={24} color="#EF4444" />
          <Text className="ml-4 text-base font-medium text-red-500">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isInitialLoading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-black"
        edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#dc2626" />
        <Text className="mt-4 text-gray-400">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Mobile Sidebar Overlay */}
      <Modal
        visible={isSidebarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSidebarOpen(false)}>
        <Pressable className="absolute inset-0 bg-black/70" onPress={() => setIsSidebarOpen(false)}>
          <View
            className="h-full w-80 bg-gray-900"
            style={{ paddingTop: StatusBar.currentHeight || 0 }}>
            <Pressable className="flex-1" onPress={(e) => e.stopPropagation()}>
              <Sidebar />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <View className="flex-1 flex-row">
        {/* Desktop Sidebar - Fixed - Only show on web and large screens */}
        {isWeb && isLargeScreen && (
          <View style={{ width: 256 }} className="flex-shrink-0">
            <Sidebar />
          </View>
        )}

        {/* Main Content */}
        <View className="flex-1">
          {/* Header */}
          <View className="border-b border-gray-800 bg-gray-900 px-4 py-3">
            <View className="flex-row items-center justify-between">
              {/* Left: Hamburger + Restaurant Selector */}
              <View className="mr-3 flex-1 flex-row items-center">
                {!isWeb && (
                  <TouchableOpacity onPress={() => setIsSidebarOpen(true)} className="mr-3 p-1">
                    <MaterialIcons name="menu" size={24} color="#fff" />
                  </TouchableOpacity>
                )}

                {/* Restaurant Selector */}
                <View className="flex-1" style={{ maxWidth: isWeb ? 280 : width * 0.6 }}>
                  <Text className="mb-1 text-xs text-gray-400">Restaurant</Text>
                  {restaurants.length > 0 ? (
                    <Select
                      value={selectedRestaurantId}
                      onValueChange={setSelectedRestaurantId}
                      options={restaurants.map((r) => ({ label: r.name, value: r.id.toString() }))}
                      variant="underline"
                    />
                  ) : (
                    <Text className="text-sm text-gray-500">No restaurants</Text>
                  )}
                </View>
              </View>

              {/* Right: User Profile */}
              <View className="flex-shrink-0 flex-row items-center">
                {isLoadingUser ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    {isWeb && isMediumScreen && user && (
                      <View className="mr-3 items-end">
                        <Text className="text-sm font-semibold text-white">{user.name}</Text>
                        <Text className="text-xs capitalize text-gray-400">
                          {(user as any)?.role}
                        </Text>
                      </View>
                    )}
                    <Avatar fallback={user?.name || 'User'} size="md" />
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Page Content - Slot renders the current route's page */}
          <Slot />
        </View>
      </View>
    </SafeAreaView>
  );
}
