import { View, Text } from 'react-native';
import { type MyInvitation } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';
import { getExpiryBadge } from '@/lib/utils/invitation';

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

  return (
    <Card className="mb-3">
      <CardContent>
        <View className="flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-xl bg-brand/15 items-center justify-center">
            <MaterialIcons name="mail" size={24} color="#F97316" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-bold">{invitation.restaurantName}</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Badge variant={expiry.variant}>{expiry.label}</Badge>
            </View>
          </View>
        </View>
        <View className="flex-row gap-2 mt-3">
          <Button
            title="Reject"
            size="sm"
            variant="secondary"
            onPress={() => onReject(invitation)}
            loading={isRejecting}
            disabled={disabled}
            className="flex-1"
          />
          <Button
            title="Accept"
            size="sm"
            onPress={() => onAccept(invitation)}
            loading={isAccepting}
            disabled={disabled}
            className="flex-1"
          />
        </View>
      </CardContent>
    </Card>
  );
}
