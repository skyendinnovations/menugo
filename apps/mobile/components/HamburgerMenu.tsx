/**

 * HamburgerMenu - A slide-in drawer navigation for staff app.

 * Shows routes relevant to the user's role and handles restaurant switching.

 */

import {

  Animated,

  Dimensions,

  Image,

  Modal,

  ScrollView,

  Text,

  TouchableOpacity,

  TouchableWithoutFeedback,

  View,

} from 'react-native';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';

import { MaterialIcons } from '@expo/vector-icons';

import { ROUTES } from '@/lib/routes';

import { useAuth } from '@/lib/hooks/useAuth';

import { type Restaurant } from '@/lib/api';

import { fileAPI } from '@/lib/api/file';

import { authAPI } from '@/lib/api';

import { signOut } from '@/lib/auth-client';



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

  altPermission?: string; // accessible if EITHER permission is granted

  dividerBefore?: boolean;

}



const STAFF_ROUTES: MenuRoute[] = [

  {

    key: 'kitchen',

    label: 'Kitchen',

    icon: 'soup-kitchen',

    route: 'kitchen',

    color: '#DC2626',

    permission: 'view_orders',

  },

  {

    key: 'waiter',

    label: 'Waiter',

    icon: 'room-service',

    route: 'waiter',

    color: '#DC2626',

    permission: 'view_orders',

  },

  {

    key: 'cashier',

    label: 'Cashier',

    icon: 'point-of-sale',

    route: 'cashier',

    color: '#DC2626',

    permission: 'close_sessions',

  },

  {

    key: 'orders',

    label: 'Orders',

    icon: 'receipt-long',

    route: 'orders',

    color: '#DC2626',

    permission: 'view_orders',

    dividerBefore: true,

  },

  {

    key: 'tables',

    label: 'Tables',

    icon: 'table-restaurant',

    route: 'tables',

    color: '#DC2626',

    // Accessible to table managers AND to waiters who can create orders

    permission: 'manage_tables',

    altPermission: 'create_orders',

  },

  {

    key: 'menu',

    label: 'Menu',

    icon: 'restaurant-menu',

    route: 'menu',

    color: '#DC2626',

    permission: 'manage_menu',

  },

  {

    key: 'members',

    label: 'Members',

    icon: 'people',

    route: 'members',

    color: '#DC2626',

    permission: 'manage_members',

  },

  {

    key: 'roles',

    label: 'Roles',

    icon: 'admin-panel-settings',

    route: 'roles',

    color: '#DC2626',

    permission: 'manage_roles',

  },

  {

    key: 'notification-settings',

    label: 'Notifications',

    icon: 'notifications-active',

    route: 'notification-settings',

    color: '#DC2626',

    permission: 'manage_restaurant',

  },

  {

    key: 'subscription',

    label: 'Subscription',

    icon: 'workspace-premium',

    route: 'subscription',

    color: '#DC2626',

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

    color: '#DC2626',

    dividerBefore: true,

  },

  {

    key: 'invitations',

    label: 'Invitations',

    icon: 'mail',

    topRoute: ROUTES.ADMIN.ACCEPT_INVITATION,

    color: '#DC2626',

  },

  {

    key: 'profile',

    label: 'Profile',

    icon: 'person',

    topRoute: ROUTES.ADMIN.PROFILE,

    color: '#DC2626',

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

  readonly visible: boolean;

  readonly onClose: () => void;

  readonly restaurantId: number;

  readonly restaurantName: string;

  readonly restaurantLogo: string | null;

  readonly permissions?: Record<string, boolean>;

  readonly isOwner?: boolean;

  readonly restaurants?: Restaurant[];

  readonly onRestaurantSelect: (id: number) => void;

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

  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const [showRestaurantSwitcher, setShowRestaurantSwitcher] = useState(false);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : DRAWER_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);



  const navigateTo = (route: MenuRoute) => {

    onClose();

    if (route.topRoute) {

      router.push(route.topRoute as any);

    } else if (route.route && restaurantId) {

      router.push(ROUTES.ADMIN.RESTAURANTS.subpage(restaurantId, route.route) as any);

    }

  };



  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {

    setLoggingOut(true);

    onClose();

    try {

      await authAPI.signOut();

      await signOut();

      router.replace(ROUTES.AUTH.SIGN_IN);

    } catch (error) {

      console.error('Logout error:', error);

      router.replace(ROUTES.AUTH.SIGN_IN);

    } finally {

      setLoggingOut(false);

    }

  };



  const visibleRestaurantRoutes = STAFF_ROUTES.filter(

    (r) =>

      !r.permission ||

      permissions[r.permission] ||

      (r.altPermission && permissions[r.altPermission])

  );



  return (
    <>
      <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Drawer - right side */}
          <Animated.View
            style={{
              width: DRAWER_WIDTH,
              height: '100%',
              backgroundColor: '#FFFFFF',
              borderLeftWidth: 1,
              borderLeftColor: '#E5E7EB',
              transform: [{ translateX }],
            }}>

              {/* ─── Header with user info ─── */}

              <View

                style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 }}

                className="border-b border-gray-200">

                <View className="flex-row items-center gap-3">

                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-muted">

                    <MaterialIcons name="person" size={24} color="#DC2626" />

                  </View>

                  <View className="flex-1">

                    <Text className="text-base font-bold text-black" numberOfLines={1}>

                      {authData?.user?.name || 'Staff'}

                    </Text>

                    <Text className="text-xs text-gray-500" numberOfLines={1}>

                      {authData?.user?.email || ''}

                    </Text>

                  </View>

                  <TouchableOpacity

                    onPress={onClose}

                    className="h-9 w-9 items-center justify-center rounded-xl bg-gray-100">

                    <MaterialIcons name="close" size={20} color="#6B7280" />

                  </TouchableOpacity>

                </View>



                {/* ─── Active restaurant chip + switcher ─── */}

                {!!restaurantName && (

                  <TouchableOpacity

                    onPress={() => setShowRestaurantSwitcher(true)}

                    activeOpacity={0.7}

                    className="mt-4 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">

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

                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand-muted">

                        <MaterialIcons name="restaurant" size={14} color="#DC2626" />

                      </View>

                    )}

                    <Text className="flex-1 text-sm font-semibold text-black" numberOfLines={1}>

                      {restaurantName}

                    </Text>

                    {restaurants.length > 1 && (

                      <MaterialIcons name="unfold-more" size={16} color="#6B7280" />

                    )}

                  </TouchableOpacity>

                )}

              </View>



              {/* ─── Menu items ─── */}

              <ScrollView

                showsVerticalScrollIndicator={false}

                contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}>

                {/* Restaurant-specific routes */}

                {visibleRestaurantRoutes.map((route) => {

                  const isVisible =

                    !route.dividerBefore || visibleRestaurantRoutes.includes(route);

                  if (!isVisible) return null;



                  return (

                    <TouchableOpacity

                      key={route.key}

                      onPress={() => navigateTo(route)}

                      activeOpacity={0.7}

                      className="mb-0.5 flex-row items-center gap-3 rounded-xl px-3 py-3.5">

                      <View

                        className="h-9 w-9 items-center justify-center rounded-xl"

                        style={{ backgroundColor: route.color + '20' }}>

                        <MaterialIcons name={route.icon} size={18} color={route.color} />

                      </View>

                      <Text className="text-sm font-semibold text-gray-800">{route.label}</Text>

                    </TouchableOpacity>

                  );

                })}



                {/* Top-level routes */}

                {TOP_ROUTES.map((route) => {

                  const isVisible =

                    !route.dividerBefore || visibleRestaurantRoutes.includes(route);

                  if (!isVisible) return null;



                  return (

                    <TouchableOpacity

                      key={route.key}

                      onPress={() => navigateTo(route)}

                      activeOpacity={0.7}

                      className="mb-0.5 flex-row items-center gap-3 rounded-xl px-3 py-3.5">

                      <View

                        className="h-9 w-9 items-center justify-center rounded-xl"

                        style={{ backgroundColor: route.color + '20' }}>

                        <MaterialIcons name={route.icon} size={18} color={route.color} />

                      </View>

                      <Text className="text-sm font-semibold text-gray-800">{route.label}</Text>

                    </TouchableOpacity>

                  );

                })}



                {/* Sign out */}

                <View className="my-2 h-px bg-gray-200" />

                <TouchableOpacity

                  onPress={handleLogout}

                  activeOpacity={0.7}

                  className="flex-row items-center gap-3 rounded-xl px-3 py-3.5">

                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">

                    <MaterialIcons name="logout" size={18} color="#EF4444" />

                  </View>

                  <Text className="text-sm font-semibold text-red-500">Sign Out</Text>

                </TouchableOpacity>

              </ScrollView>
            </Animated.View>

            {/* Backdrop - left of drawer */}
            <TouchableWithoutFeedback onPress={onClose}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} />
            </TouchableWithoutFeedback>
          </View>
        </Modal>



      {/* ─── Restaurant Switcher Sheet ─── */}

      <RestaurantSwitcherSheet

        visible={showRestaurantSwitcher}

        restaurants={restaurants}

        currentRestaurantId={restaurantId}

        onClose={() => setShowRestaurantSwitcher(false)}

        onSelect={(id: number) => {

          setShowRestaurantSwitcher(false);

          onClose();

          onRestaurantSelect?.(id);

        }}

      />
    </>
  );

}



// ─── Restaurant Switcher Bottom Sheet ─────────────────────────────────────────



interface SwitcherProps {

  readonly visible: boolean;

  readonly restaurants: Restaurant[];

  readonly currentRestaurantId: number;

  readonly onClose: () => void;

  readonly onSelect: (id: number) => void;

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

                backgroundColor: '#FFFFFF',

                borderTopLeftRadius: 24,

                borderTopRightRadius: 24,

                borderTopWidth: 1,

                borderTopColor: '#E5E7EB',

                paddingBottom: 40,

                transform: [{ translateY }],

              }}>

              {/* Handle */}

              <View className="items-center pb-1 pt-3">

                <View className="h-1 w-12 rounded-full bg-gray-300" />

              </View>



              <View className="flex-row items-center justify-between px-5 py-4">

                <Text className="text-lg font-bold text-black">Switch Restaurant</Text>

                <TouchableOpacity onPress={onClose} className="h-8 w-8 items-center justify-center">

                  <MaterialIcons name="close" size={20} color="#6B7280" />

                </TouchableOpacity>

              </View>



              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>

                {restaurants.map((r) => {

                  const isActive = r.id === currentRestaurantId;

                  return (

                    <TouchableOpacity

                      key={r.id}

                      onPress={() => onSelect(r.id)}

                      activeOpacity={0.7}

                      className={`mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border px-4 py-4 ${

                        isActive ? 'border-brand/30 bg-brand/10' : 'border-gray-200 bg-gray-50'

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

                            isActive ? 'bg-brand/20' : 'bg-gray-200'

                          }`}>

                          <MaterialIcons

                            name="restaurant"

                            size={20}

                            color={isActive ? '#DC2626' : '#9CA3AF'}

                          />

                        </View>

                      )}

                      <View className="flex-1">

                        <Text

                          className={`text-sm font-bold ${isActive ? 'text-brand' : 'text-black'}`}>

                          {r.name}

                        </Text>

                        {r.address && (

                          <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={1}>

                            {r.address}

                          </Text>

                        )}

                      </View>

                      {isActive && <MaterialIcons name="check-circle" size={18} color="#DC2626" />}

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

