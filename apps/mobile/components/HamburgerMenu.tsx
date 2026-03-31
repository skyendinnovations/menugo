/**
 * HamburgerMenu - A slide-in drawer navigation for staff app.
 * Shows routes relevant to the user's role and handles restaurant switching.
 */
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  Alert,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/lib/hooks/useAuth';
import { restaurantAPI, type Restaurant } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { authClient } from '@/lib/auth-client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

interface MenuRoute {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route?: string; // restaurant-level route
  topRoute?: string; // top-level route (no restaurant id)
  color: string;
  permission?: string;
  dividerBefore?: boolean;
}

const RESTAURANT_ROUTES: MenuRoute[] = [
  {
    key: 'kitchen',
    label: 'Kitchen',
    icon: 'soup-kitchen',
    route: 'kitchen',
    color: '#EF4444',
    permission: 'view_orders',
  },
  {
    key: 'waiter',
    label: 'Waiter',
    icon: 'room-service',
    route: 'waiter',
    color: '#06B6D4',
    permission: 'view_orders',
  },
  {
    key: 'cashier',
    label: 'Cashier',
    icon: 'point-of-sale',
    route: 'cashier',
    color: '#22C55E',
    permission: 'close_sessions',
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: 'receipt-long',
    route: 'orders',
    color: '#F59E0B',
    permission: 'view_orders',
    dividerBefore: true,
  },
  {
    key: 'tables',
    label: 'Tables',
    icon: 'table-restaurant',
    route: 'tables',
    color: '#3B82F6',
    permission: 'manage_tables',
  },
  {
    key: 'menu',
    label: 'Menu',
    icon: 'restaurant-menu',
    route: 'menu',
    color: '#10B981',
    permission: 'manage_menu',
  },
  {
    key: 'members',
    label: 'Members',
    icon: 'people',
    route: 'members',
    color: '#8B5CF6',
    permission: 'manage_members',
  },
  {
    key: 'roles',
    label: 'Roles',
    icon: 'admin-panel-settings',
    route: 'roles',
    color: '#F43F5E',
    permission: 'manage_roles',
  },
  {
    key: 'notification-settings',
    label: 'Notifications',
    icon: 'notifications-active',
    route: 'notification-settings',
    color: '#FBBF24',
    permission: 'manage_restaurant',
  },
  {
    key: 'subscription',
    label: 'Subscription',
    icon: 'workspace-premium',
    route: 'subscription',
    color: '#F97316',
    permission: 'manage_restaurant',
  },
  {
    key: 'edit',
    label: 'Edit Restaurant',
    icon: 'edit',
    route: 'edit',
    color: '#94A3B8',
    permission: 'manage_restaurant',
  },
];

const TOP_ROUTES: MenuRoute[] = [
  {
    key: 'restaurants',
    label: 'My Restaurants',
    icon: 'store',
    topRoute: ROUTES.ADMIN.HOME,
    color: '#F97316',
    dividerBefore: true,
  },
  {
    key: 'invitations',
    label: 'Invitations',
    icon: 'mail',
    topRoute: ROUTES.ADMIN.ACCEPT_INVITATION,
    color: '#8B5CF6',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person',
    topRoute: ROUTES.ADMIN.PROFILE,
    color: '#06B6D4',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings',
    topRoute: '/(admin)/settings',
    color: '#94A3B8',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  restaurantId?: number;
  restaurantName?: string;
  restaurantLogo?: string | null;
  permissions?: Record<string, boolean>;
  isOwner?: boolean;
  restaurants?: Restaurant[];
  onRestaurantSelect?: (restaurant: Restaurant) => void;
}

export function HamburgerMenu({
  visible,
  onClose,
  restaurantId,
  restaurantName,
  restaurantLogo,
  permissions = {},
  isOwner = false,
  restaurants = [],
  onRestaurantSelect,
}: Props) {
  const router = useRouter();
  const { data: authData } = useAuth();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [showRestaurantSwitcher, setShowRestaurantSwitcher] = useState(false);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  const canAccess = (route: MenuRoute) => {
    if (!route.permission) return true;
    if (isOwner) return true;
    return permissions[route.permission] === true;
  };

  const navigateTo = (route: MenuRoute) => {
    onClose();
    if (route.topRoute) {
      router.push(route.topRoute as any);
    } else if (route.route && restaurantId) {
      router.push(ROUTES.ADMIN.RESTAURANTS.subpage(restaurantId, route.route) as any);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          onClose();
          await authClient.signOut();
          router.replace('/(auth)/sign-in' as any);
        },
      },
    ]);
  };

  const visibleRestaurantRoutes = restaurantId ? RESTAURANT_ROUTES.filter(canAccess) : [];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={{
                width: DRAWER_WIDTH,
                height: '100%',
                backgroundColor: '#0F172A',
                borderRightWidth: 1,
                borderRightColor: '#1E293B',
                transform: [{ translateX }],
              }}>
              {/* ─── Header with user info ─── */}
              <View
                style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}
                className="border-b border-slate-800">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/15">
                    <MaterialIcons name="person" size={24} color="#F97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-white" numberOfLines={1}>
                      {authData?.user?.name || 'Staff'}
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {authData?.user?.email || ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    className="h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                    <MaterialIcons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* ─── Active restaurant chip + switcher ─── */}
                {restaurantName && (
                  <TouchableOpacity
                    onPress={() => setShowRestaurantSwitcher(true)}
                    activeOpacity={0.7}
                    className="mt-4 flex-row items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5">
                    {restaurantLogo ? (
                      <Image
                        source={{
                          uri: restaurantLogo.startsWith('http')
                            ? restaurantLogo
                            : fileAPI.getFullUrl(restaurantLogo),
                        }}
                        className="h-7 w-7 rounded-lg"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand/15">
                        <MaterialIcons name="restaurant" size={14} color="#F97316" />
                      </View>
                    )}
                    <Text className="flex-1 text-sm font-semibold text-white" numberOfLines={1}>
                      {restaurantName}
                    </Text>
                    {restaurants.length > 1 && (
                      <MaterialIcons name="unfold-more" size={16} color="#64748B" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* ─── Menu items ─── */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}>
                {/* Restaurant-specific routes */}
                {visibleRestaurantRoutes.map((route) => (
                  <View key={route.key}>
                    {route.dividerBefore && visibleRestaurantRoutes.indexOf(route) > 0 && (
                      <View className="my-2 h-px bg-slate-800" />
                    )}
                    <TouchableOpacity
                      onPress={() => navigateTo(route)}
                      activeOpacity={0.7}
                      className="mb-0.5 flex-row items-center gap-3 rounded-xl px-3 py-3.5">
                      <View
                        className="h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: route.color + '20' }}>
                        <MaterialIcons name={route.icon} size={18} color={route.color} />
                      </View>
                      <Text className="text-sm font-semibold text-slate-200">{route.label}</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Top-level routes */}
                {TOP_ROUTES.map((route) => (
                  <View key={route.key}>
                    {route.dividerBefore && <View className="my-2 h-px bg-slate-800" />}
                    <TouchableOpacity
                      onPress={() => navigateTo(route)}
                      activeOpacity={0.7}
                      className="mb-0.5 flex-row items-center gap-3 rounded-xl px-3 py-3.5">
                      <View
                        className="h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: route.color + '20' }}>
                        <MaterialIcons name={route.icon} size={18} color={route.color} />
                      </View>
                      <Text className="text-sm font-semibold text-slate-200">{route.label}</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Sign out */}
                <View className="my-2 h-px bg-slate-800" />
                <TouchableOpacity
                  onPress={handleSignOut}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-3 rounded-xl px-3 py-3.5">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                    <MaterialIcons name="logout" size={18} color="#EF4444" />
                  </View>
                  <Text className="text-sm font-semibold text-red-400">Sign Out</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* ─── Restaurant Switcher Sheet ─── */}
      <RestaurantSwitcherSheet
        visible={showRestaurantSwitcher}
        restaurants={restaurants}
        currentRestaurantId={restaurantId}
        onClose={() => setShowRestaurantSwitcher(false)}
        onSelect={(r) => {
          setShowRestaurantSwitcher(false);
          onClose();
          onRestaurantSelect?.(r);
        }}
      />
    </Modal>
  );
}

// ─── Restaurant Switcher Bottom Sheet ─────────────────────────────────────────

interface SwitcherProps {
  visible: boolean;
  restaurants: Restaurant[];
  currentRestaurantId?: number;
  onClose: () => void;
  onSelect: (r: Restaurant) => void;
}

function RestaurantSwitcherSheet({
  visible,
  restaurants,
  currentRestaurantId,
  onClose,
  onSelect,
}: SwitcherProps) {
  const translateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      damping: 25,
      stiffness: 200,
    }).start();
  }, [visible, translateY]);

  if (!visible && !restaurants.length) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={{
                backgroundColor: '#1E293B',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderTopColor: '#334155',
                paddingBottom: 40,
                transform: [{ translateY }],
              }}>
              {/* Handle */}
              <View className="items-center pb-1 pt-3">
                <View className="h-1 w-12 rounded-full bg-slate-600" />
              </View>

              <View className="flex-row items-center justify-between px-5 py-4">
                <Text className="text-lg font-bold text-white">Switch Restaurant</Text>
                <TouchableOpacity onPress={onClose} className="h-8 w-8 items-center justify-center">
                  <MaterialIcons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                {restaurants.map((r) => {
                  const isActive = r.id === currentRestaurantId;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => onSelect(r)}
                      activeOpacity={0.7}
                      className={`mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border px-4 py-4 ${
                        isActive ? 'border-brand/30 bg-brand/10' : 'border-slate-700 bg-slate-800'
                      }`}>
                      {r.logo ? (
                        <Image
                          source={{
                            uri: r.logo.startsWith('http') ? r.logo : fileAPI.getFullUrl(r.logo),
                          }}
                          className="h-10 w-10 rounded-xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          className={`h-10 w-10 items-center justify-center rounded-xl ${
                            isActive ? 'bg-brand/20' : 'bg-slate-700'
                          }`}>
                          <MaterialIcons
                            name="restaurant"
                            size={20}
                            color={isActive ? '#F97316' : '#94A3B8'}
                          />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-bold ${isActive ? 'text-brand' : 'text-white'}`}>
                          {r.name}
                        </Text>
                        {r.address && (
                          <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                            {r.address}
                          </Text>
                        )}
                      </View>
                      {isActive && <MaterialIcons name="check-circle" size={18} color="#F97316" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
