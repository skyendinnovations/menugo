import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantAPI, type Restaurant, memberAPI, type MyInvitation, adminAPI } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { InvitationCard } from '@/components/InvitationCard';
import { useInvitationActions } from '@/lib/hooks/useInvitationActions';
import { useMembershipStatus } from '@/lib/hooks/useMembershipStatus';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

/* ── Theme tokens ─────────────────────────────────────────────── */
const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const RED_MUTED = '#FCA5A5';
const GRAY_900 = '#111827';
const GRAY_700 = '#374151';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const GRAY_50 = '#F9FAFB';
const WHITE = '#FFFFFF';
const GREEN = '#16A34A';
const GREEN_LIGHT = '#F0FDF4';

export default function HomePage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { canCreateRestaurant, isStaff, loading: statusLoading } = useMembershipStatus();

  const fetchData = useCallback(async () => {
    try {
      const [restaurantRes, invitationRes] = await Promise.all([
        restaurantAPI.getAll(),
        memberAPI.getMyInvitations(),
      ]);
      setRestaurants(restaurantRes.data || []);
      setInvitations(invitationRes.data || []);

      // Check super admin access (non-blocking, only for non-staff)
      if (!isStaff) {
        try {
          await adminAPI.getStats();
          setIsSuperAdmin(true);
        } catch {
          setIsSuperAdmin(false);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStaff]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const { acceptingId, rejectingId, isBusy, handleAccept, handleReject } = useInvitationActions(
    setInvitations,
    { onUpdate: fetchData }
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE }}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  const hasRestaurants = restaurants.length > 0;
  const hasInvitations = invitations.length > 0;
  const isEmpty = !hasRestaurants && !hasInvitations;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: WHITE }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />
      }>
      <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16 }}>
        {/* Header — only show create button for owners / new users */}
        {canCreateRestaurant && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.CREATE as any)}
              activeOpacity={0.85}
              style={{
                backgroundColor: RED,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                ...Platform.select({
                  ios: { shadowColor: RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
                  android: { elevation: 4 },
                  default: { boxShadow: '0 3px 10px rgba(220,38,38,0.2)' } as any,
                }),
              }}>
              <Ionicons name="add" size={18} color={WHITE} />
              <Text style={{ color: WHITE, fontSize: 14, fontWeight: '600' }}>Restaurant</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Super Admin link */}
        {isSuperAdmin && (
          <TouchableOpacity
            onPress={() => router.push('/(admin)/super-admin' as any)}
            activeOpacity={0.7}
            style={{
              backgroundColor: WHITE,
              borderWidth: 1.5,
              borderColor: GRAY_200,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: RED_LIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcons name="admin-panel-settings" size={22} color={RED} />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: GRAY_900 }}>Super Admin Panel</Text>
                <Text style={{ fontSize: 12, color: GRAY_500 }}>Manage platform restaurants & users</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={GRAY_400} />
          </TouchableOpacity>
        )}

        {/* Empty state */}
        {isEmpty && (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 24,
                backgroundColor: RED_LIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}>
              <Ionicons name="restaurant" size={48} color={RED} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: GRAY_900, textAlign: 'center' }}>
              Welcome to MenuGo!
            </Text>
            <Text style={{ fontSize: 15, color: GRAY_500, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
              You don't have any restaurants yet. Create one or ask a restaurant admin to invite you.
            </Text>
          </View>
        )}

        {/* Invitations section — hidden for staff members */}
        {hasInvitations && !isStaff && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: GRAY_900, marginBottom: 12 }}>
              Pending Invitations
            </Text>
            {invitations.map((item) => (
              <InvitationCard
                key={item.id}
                invitation={item}
                onAccept={handleAccept}
                onReject={handleReject}
                isAccepting={acceptingId === item.id}
                isRejecting={rejectingId === item.id}
                disabled={isBusy}
              />
            ))}
          </View>
        )}

        {/* Restaurants section */}
        {hasRestaurants && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: GRAY_900, marginBottom: 12 }}>
              My Restaurants
            </Text>
            {restaurants.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.detail(item.id) as any)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: WHITE,
                  borderWidth: 1.5,
                  borderColor: GRAY_200,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  {item.logo ? (
                    <Image
                      source={{
                        uri: item.logo.startsWith('http')
                          ? item.logo
                          : fileAPI.getFullUrl(item.logo),
                      }}
                      style={{ width: 48, height: 48, borderRadius: 14 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: RED_LIGHT,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <MaterialIcons name="restaurant" size={24} color={RED} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: GRAY_900 }}>{item.name}</Text>
                    {item.description ? (
                      <Text style={{ fontSize: 13, color: GRAY_500, marginTop: 2 }} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}
                    {item.address ? (
                      <Text style={{ fontSize: 12, color: GRAY_400, marginTop: 2 }} numberOfLines={1}>
                        {item.address}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: item.isActive ? GREEN_LIGHT : RED_LIGHT,
                    }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: item.isActive ? GREEN : RED,
                      }}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={GRAY_400} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
