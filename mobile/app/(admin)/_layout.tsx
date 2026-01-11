import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Platform, StatusBar, useWindowDimensions, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slot, Link, useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar, Select } from '@/components/ui';
import { authAPI, restaurantAPI, Restaurant } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_RESTAURANT_KEY = '@selected_restaurant_id';

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
  
  // Get real user data
  const { data: session, isPending: isLoadingUser } = useAuth();
  const user = session?.user;

  // Load saved restaurant selection
  useEffect(() => {
    const loadSavedSelection = async () => {
      try {
        if (Platform.OS === 'web') {
          const saved = localStorage.getItem(SELECTED_RESTAURANT_KEY);
          if (saved) return saved;
        } else {
          const saved = await AsyncStorage.getItem(SELECTED_RESTAURANT_KEY);
          if (saved) return saved;
        }
      } catch (error) {
        console.error('Failed to load saved restaurant:', error);
      }
      return null;
    };

    const fetchRestaurants = async () => {
      try {
        const response = await restaurantAPI.getRestaurants();
        if (response && response.data && response.data.length > 0) {
          setRestaurants(response.data);
          
          // Try to load saved selection
          const savedId = await loadSavedSelection();
          
          // Check if saved restaurant still exists
          if (savedId && response.data.some(r => r.id.toString() === savedId)) {
            setSelectedRestaurantId(savedId);
          } else {
            // Set the first restaurant as selected by default
            setSelectedRestaurantId(response.data[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
      }
    };
    
    fetchRestaurants();
  }, []);

  // Save restaurant selection when it changes
  useEffect(() => {
    const saveSelection = async () => {
      if (!selectedRestaurantId) return;
      
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem(SELECTED_RESTAURANT_KEY, selectedRestaurantId);
        } else {
          await AsyncStorage.setItem(SELECTED_RESTAURANT_KEY, selectedRestaurantId);
        }
      } catch (error) {
        console.error('Failed to save restaurant selection:', error);
      }
    };

    saveSelection();
  }, [selectedRestaurantId]);

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
    // Normalize pathname to handle both /restaurants and /(admin)/restaurants
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    
    // For dashboard, only match exact paths
    if (route === '/(admin)') {
      return normalizedPath === '/' || normalizedPath === '/(admin)';
    }
    
    // For other routes, check multiple path formats
    // Check if it matches /(admin)/restaurants or /restaurants
    const routeWithoutGroup = route.replace('/(admin)', '');
    return normalizedPath.startsWith(route) || 
           normalizedPath.startsWith(routeWithoutGroup) ||
           normalizedPath === route ||
           normalizedPath === routeWithoutGroup;
  };

  const Sidebar = () => (
    <View className="bg-gray-900 h-full border-r border-gray-800">
      {/* Sidebar Header with Close Button */}
      <View className="p-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-xl font-bold">MenuGo</Text>
            <Text className="text-gray-400 text-xs mt-0.5">Admin Portal</Text>
          </View>
          {!isWeb && (
            <TouchableOpacity 
              onPress={() => setIsSidebarOpen(false)}
              className="bg-gray-800 p-2 rounded-lg active:bg-gray-700"
            >
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
                className={`flex-row items-center p-4 rounded-lg mb-2 ${
                  isActive ? 'bg-red-900/20 border-l-4 border-red-600' : 'active:bg-gray-800'
                }`}
                onPress={() => setIsSidebarOpen(false)}
              >
                <MaterialIcons name={item.icon as any} size={24} color={isActive ? '#DC2626' : '#9CA3AF'} />
                <Text className={`ml-4 text-base font-medium ${isActive ? 'text-red-500' : 'text-gray-300'}`}>{item.label}</Text>
              </TouchableOpacity>
            </Link>
          );
        })}
      </ScrollView>

      <View className="p-4 border-t border-gray-800">
        <TouchableOpacity 
          onPress={handleSignOut}
          className="flex-row items-center p-4 rounded-lg active:bg-gray-800"
        >
          <MaterialIcons name="logout" size={24} color="#EF4444" />
          <Text className="text-red-500 ml-4 text-base font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Mobile Sidebar Overlay */}
      <Modal
        visible={isSidebarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSidebarOpen(false)}
      >
        <Pressable 
          className="absolute inset-0 bg-black/70"
          onPress={() => setIsSidebarOpen(false)}
        >
          <View className="w-80 h-full bg-gray-900" style={{ paddingTop: StatusBar.currentHeight || 0 }}>
            <Pressable 
              className="flex-1"
              onPress={(e) => e.stopPropagation()}
            >
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
          <View className="bg-gray-900 border-b border-gray-800 px-4 py-3">
            <View className="flex-row items-center justify-between">
              {/* Left: Hamburger + Restaurant Selector */}
              <View className="flex-row items-center flex-1 mr-3">
                {!isWeb && (
                  <TouchableOpacity 
                    onPress={() => setIsSidebarOpen(true)}
                    className="mr-3 p-1"
                  >
                    <MaterialIcons name="menu" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                
                {/* Restaurant Selector */}
                <View className="flex-1" style={{ maxWidth: isWeb ? 280 : width * 0.6 }}>
                  <Text className="text-gray-400 text-xs mb-1">Restaurant</Text>
                  {restaurants.length > 0 ? (
                    <Select
                      value={selectedRestaurantId}
                      onValueChange={setSelectedRestaurantId}
                      options={restaurants.map(r => ({ label: r.name, value: r.id.toString() }))}
                      variant="underline"
                    />
                  ) : (
                    <Text className="text-gray-500 text-sm">No restaurants</Text>
                  )}
                </View>
              </View>

              {/* Right: User Profile */}
              <View className="flex-row items-center flex-shrink-0">
                {isLoadingUser ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    {isWeb && isMediumScreen && user && (
                      <View className="mr-3 items-end">
                        <Text className="text-white font-semibold text-sm">{user.name}</Text>
                        <Text className="text-gray-400 text-xs capitalize">{user.role}</Text>
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
