import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type MyInvitation } from '@/lib/api';
import { InvitationCard } from '@/components/InvitationCard';
import { useInvitationActions } from '@/lib/hooks/useInvitationActions';
import { Ionicons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const GRAY_900 = '#111827';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const GRAY_50 = '#F9FAFB';
const WHITE = '#FFFFFF';

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await memberAPI.getMyInvitations();
      setInvitations(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchInvitations();
    }, [fetchInvitations])
  );

  const { acceptingId, rejectingId, isBusy, handleAccept, handleReject } =
    useInvitationActions(setInvitations);

  const renderInvitation = ({ item }: { item: MyInvitation }) => (
    <InvitationCard
      invitation={item}
      onAccept={handleAccept}
      onReject={handleReject}
      isAccepting={acceptingId === item.id}
      isRejecting={rejectingId === item.id}
      disabled={isBusy}
    />
  );

  const renderEmpty = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 24,
          backgroundColor: GRAY_50,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
        <Ionicons name="mail-open-outline" size={48} color={GRAY_400} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: GRAY_900, textAlign: 'center' }}>
        No Invitations
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: GRAY_500,
          textAlign: 'center',
          marginTop: 10,
          lineHeight: 22,
        }}>
        You don't have any pending invitations. Ask a restaurant owner to invite you, or create
        your own restaurant.
      </Text>
      <TouchableOpacity
        onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.CREATE as any)}
        activeOpacity={0.85}
        style={{
          backgroundColor: RED,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 28,
          marginTop: 24,
          alignItems: 'center',
          flexDirection: 'row',
          gap: 8,
          ...Platform.select({
            ios: { shadowColor: RED, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
            android: { elevation: 6 },
            default: { boxShadow: '0 4px 14px rgba(220,38,38,0.3)' } as any,
          }),
        }}>
        <Ionicons name="add" size={20} color={WHITE} />
        <Text style={{ color: WHITE, fontSize: 16, fontWeight: '600' }}>Create Restaurant</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: GRAY_900 }}>My Invitations</Text>
        <TouchableOpacity
          onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.CREATE as any)}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: GRAY_200,
            backgroundColor: WHITE,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
          <Ionicons name="add" size={16} color={GRAY_500} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: GRAY_500 }}>Restaurant</Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error ? (
        <View
          style={{
            marginHorizontal: 20,
            backgroundColor: RED_LIGHT,
            borderWidth: 1,
            borderColor: '#FECACA',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
          <Ionicons name="alert-circle" size={20} color={RED} />
          <Text style={{ color: '#991B1B', fontSize: 14, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={RED} />
        </View>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitation}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            maxWidth: 600,
            width: '100%',
            alignSelf: 'center' as any,
            ...(invitations.length === 0 ? { flexGrow: 1 } : { paddingBottom: 100 }),
          }}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}
