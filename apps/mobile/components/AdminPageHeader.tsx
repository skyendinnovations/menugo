/**
 * AdminPageHeader — Consistent header for all admin/staff pages.
 * Left: back arrow, Right: hamburger menu button.
 */
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { HamburgerMenu } from './HamburgerMenu';
import { restaurantAPI, type Restaurant, memberAPI } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { ROUTES } from '@/lib/routes';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  restaurantId?: number;
  restaurantName?: string;
  restaurantLogo?: string | null;
  /** Show back button (default: true) */
  showBack?: boolean;
  /** Extra element to render between title and hamburger */
  right?: React.ReactNode;
}

export function AdminPageHeader({
  title,
  subtitle,
  restaurantId,
  restaurantName,
  restaurantLogo,
  showBack = true,
  right,
}: AdminPageHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isOwner, setIsOwner] = useState(false);

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

      <View className="flex-row items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 pb-4 pt-14">
        {/* Back button */}
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
          </TouchableOpacity>
        )}

        {/* Title area */}
        <View className="flex-1">
          <Text className="text-lg font-bold text-white" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Optional extra right element */}
        {right}

        {/* Hamburger */}
        <TouchableOpacity
          onPress={openMenu}
          className="h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
          <MaterialIcons name="menu" size={24} color="#F8FAFC" />
        </TouchableOpacity>
      </View>
    </>
  );
}
