import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { type MyInvitation } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { getExpiryBadge } from '@menugo/dto';

const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const GRAY_900 = '#111827';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const WHITE = '#FFFFFF';
const GREEN = '#16A34A';
const GREEN_LIGHT = '#F0FDF4';
const AMBER = '#D97706';
const AMBER_LIGHT = '#FFFBEB';

interface InvitationCardProps {
  invitation: MyInvitation;
  onAccept: (invitation: MyInvitation) => void;
  onReject: (invitation: MyInvitation) => void;
  isAccepting: boolean;
  isRejecting: boolean;
  disabled: boolean;
}

export function InvitationCard({
  invitation,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
  disabled,
}: InvitationCardProps) {
  const expiry = getExpiryBadge(invitation.expiresAt);

  const expiryColors: Record<string, { bg: string; color: string }> = {
    success: { bg: GREEN_LIGHT, color: GREEN },
    default: { bg: AMBER_LIGHT, color: AMBER },
    destructive: { bg: RED_LIGHT, color: RED },
    outline: { bg: '#F8FAFC', color: GRAY_500 },
  };
  const ec = expiryColors[expiry.variant] || expiryColors.default;

  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderWidth: 1.5,
        borderColor: GRAY_200,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: RED_LIGHT,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="mail" size={24} color={RED} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: GRAY_900 }}>
            {invitation.restaurantName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: ec.bg,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: ec.color }}>
                {expiry.label}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <TouchableOpacity
          onPress={() => onReject(invitation)}
          disabled={disabled}
          activeOpacity={0.7}
          style={{
            flex: 1,
            borderWidth: 1.5,
            borderColor: GRAY_200,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            backgroundColor: WHITE,
            opacity: disabled ? 0.5 : 1,
          }}>
          {isRejecting ? (
            <ActivityIndicator size="small" color={GRAY_500} />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '600', color: GRAY_500 }}>Reject</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onAccept(invitation)}
          disabled={disabled}
          activeOpacity={0.85}
          style={{
            flex: 1,
            backgroundColor: disabled ? '#FCA5A5' : RED,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
            opacity: disabled ? 0.5 : 1,
          }}>
          {isAccepting ? (
            <ActivityIndicator size="small" color={WHITE} />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '600', color: WHITE }}>Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
