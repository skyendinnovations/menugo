import { View, Text } from 'react-native';
import { type MyInvitation } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MaterialIcons } from '@expo/vector-icons';
import { getExpiryBadge } from '@menugo/dto';

interface InvitationCardProps {
  readonly invitation: MyInvitation;
  readonly onAccept: (invitation: MyInvitation) => void;
  readonly onReject: (invitation: MyInvitation) => void;
  readonly isAccepting: boolean;
  readonly isRejecting: boolean;
  readonly disabled: boolean;
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
    <Card className="mb-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <CardContent>
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
            <MaterialIcons name="mail" size={24} color="#DC2626" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-black">{invitation.restaurantName}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <Badge variant={expiry.variant}>{expiry.label}</Badge>
            </View>
          </View>
        </View>
        <View className="mt-3 flex-row gap-2">
          <Button
            title="Reject"
            size="sm"
            variant="ghost"
            onPress={() => onReject(invitation)}
            loading={isRejecting}
            disabled={disabled}
            className="flex-1 border-gray-200"
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
