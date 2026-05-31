import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { HamburgerMenu } from './HamburgerMenu';
import { restaurantAPI, type Restaurant, memberAPI } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { NativeStackHeaderProps } from '@react-navigation/native-stack';

interface AdminPageHeaderProps extends NativeStackHeaderProps {
  /** Show back button (default: true) */
  showBack?: boolean;
  /** Extra element to render between title and hamburger */
  right?: React.ReactNode;
  /** When header is used as a normal component (not stack header) */
  title?: string;
  subtitle?: string;
  restaurantId?: number | string;
}

export function AdminPageHeader(props: Readonly<AdminPageHeaderProps>) {
  const { route, options, navigation, showBack = true, right, title, subtitle, restaurantId: restaurantIdProp } = props;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isOwner, setIsOwner] = useState(false);

  // Support both stack header usage (route/options) and direct usage (title, subtitle, restaurantId)
  const restaurantId = restaurantIdProp ?? (route?.params as any)?.id;
  const restaurantName = title ?? (route?.params as any)?.name;
  const restaurantLogo = (route?.params as any)?.logo;

  // Lazy-load restaurants + membership for the drawer
  const openMenu = useCallback(async () => {
    setMenuOpen(true);
    if (allRestaurants.length === 0) {
      try {
        const tasks: Promise<any>[] = [restaurantAPI.getAll()];
        if (restaurantId) tasks.push(memberAPI.getMyMembership(restaurantId));

        const [restRes, memRes] = await Promise.all(tasks);
        setAllRestaurants(restRes?.data || []);
        if (restaurantId && memRes) {
          setPermissions(memRes.data?.permissions ?? {});
          setIsOwner(memRes.data?.isOwner ?? false);
        }
      } catch {
        // non-fatal
      }
    }
  }, [restaurantId, allRestaurants]);

  const resolveDirectBackTarget = useCallback(async () => {
    if (restaurantId === undefined || restaurantId === null) {
      return ROUTES.ADMIN.HOME;
    }

    try {
      const res = await memberAPI.getMyMembership(restaurantId);
      const membership = res.data;

      if (membership?.isOwner) {
        return ROUTES.ADMIN.RESTAURANTS.detail(restaurantId);
      }

      const roles: string[] =
        membership?.roles?.map((role: any) => (role.name || role.roleName || '').toLowerCase()) ?? [];

      for (const role of roles) {
        if (role === 'kitchen') return ROUTES.ADMIN.RESTAURANTS.subpage(restaurantId, 'kitchen');
        if (role === 'waiter' || role === 'server') {
          return ROUTES.ADMIN.RESTAURANTS.subpage(restaurantId, 'waiter');
        }
        if (role === 'cashier') return ROUTES.ADMIN.RESTAURANTS.subpage(restaurantId, 'cashier');
      }
    } catch {
      // fall through to admin home
    }

    return ROUTES.ADMIN.HOME;
  }, [restaurantId]);

  return (
    <>
      <HamburgerMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        restaurantLogo={restaurantLogo}
        permissions={permissions}
        isOwner={isOwner}
        restaurants={allRestaurants}
        onRestaurantSelect={(r) => {
          setMenuOpen(false);
          router.push(ROUTES.ADMIN.RESTAURANTS.detail(r.id) as any);
        }}
      />

      <View
        className="flex-row items-center gap-3 px-4 pb-4 border-b border-gray-200 bg-white"
        style={{ paddingTop: insets.top + 12 }}>
        {/* Back button — always show for restaurant-scoped pages even when no history */}
        {showBack && ((navigation?.canGoBack?.() ?? false) || restaurantId !== undefined) && (
          <TouchableOpacity
            onPress={() => {
              try {
                if (navigation?.canGoBack?.()) {
                  // If the previous route is an 'index' placeholder, skip it and go straight
                  // to the restaurant detail (or fallback) to avoid showing an intermediate page.
                  const state = navigation.getState?.();
                  const prevRoute = state?.routes?.slice(-2, -1)[0];
                  const prevName = prevRoute?.name as string | undefined;

                  if (prevName && /index/i.test(prevName) && restaurantId !== undefined && restaurantId !== null) {
                    resolveDirectBackTarget().then((target) => router.replace(target as any));
                    return;
                  }

                  router.back();
                } else if (restaurantId !== undefined && restaurantId !== null) {
                  resolveDirectBackTarget().then((target) => router.replace(target as any));
                } else {
                  router.replace(ROUTES.ADMIN.HOME);
                }
              } catch {
                if (restaurantId !== undefined && restaurantId !== null) {
                  resolveDirectBackTarget().then((target) => router.replace(target as any));
                } else {
                  router.replace(ROUTES.ADMIN.HOME);
                }
              }
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
            <MaterialIcons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        )}

        {/* Title area */}
        <View className="flex-1">
          <Text className="text-lg font-bold text-black" numberOfLines={1}>
            {title ?? options?.title ?? route?.name}
          </Text>
          {(subtitle ?? options?.headerTitle) ? (
            <Text className="mt-0.5 text-xs text-gray-600" numberOfLines={1}>
              {(subtitle as any) ?? options?.headerTitle?.toString()}
            </Text>
          ) : null}
        </View>

        {/* Optional extra right element */}
        {right}

        {/* Hamburger */}
        <TouchableOpacity
          onPress={openMenu}
          className="h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
          <MaterialIcons name="menu" size={24} color="#111827" />
        </TouchableOpacity>
      </View>
    </>
  );
}
