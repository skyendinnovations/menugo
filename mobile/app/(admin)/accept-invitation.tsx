import { View, Text, FlatList, ActivityIndicator, Alert as RNAlert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type MyInvitation } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { MaterialIcons } from '@expo/vector-icons';

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

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

  const isBusy = acceptingId !== null || rejectingId !== null;

  const handleAccept = async (invitation: MyInvitation) => {
    setAcceptingId(invitation.id);
    try {
      await memberAPI.acceptInvitation(invitation.token);
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      RNAlert.alert('Invitation Accepted', `You have joined ${invitation.restaurantName}.`);
    } catch (err: any) {
      RNAlert.alert('Error', err.message || 'Failed to accept invitation');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (invitation: MyInvitation) => {
    setRejectingId(invitation.id);
    try {
      await memberAPI.rejectInvitation(invitation.token);
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    } catch (err: any) {
      RNAlert.alert('Error', err.message || 'Failed to reject invitation');
    } finally {
      setRejectingId(null);
    }
  };

  const getExpiryBadge = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 1) return { label: 'Expires today', variant: 'destructive' as const };
    if (days <= 3) return { label: `${days}d left`, variant: 'default' as const };
    return { label: `${days}d left`, variant: 'success' as const };
  };

  const renderInvitation = ({ item }: { item: MyInvitation }) => {
    const expiry = getExpiryBadge(item.expiresAt);
    const isAccepting = acceptingId === item.id;
    const isRejecting = rejectingId === item.id;

    return (
      <Card className="mb-3">
        <CardContent>
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-xl bg-brand/15 items-center justify-center">
              <MaterialIcons name="restaurant" size={24} color="#F97316" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-bold">{item.restaurantName}</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Badge variant={expiry.variant}>{expiry.label}</Badge>
              </View>
            </View>
            <View className="flex-row gap-2">
              <Button
                title="Reject"
                size="sm"
                variant="secondary"
                onPress={() => handleReject(item)}
                loading={isRejecting}
                disabled={isBusy}
              />
              <Button
                title="Accept"
                size="sm"
                onPress={() => handleAccept(item)}
                loading={isAccepting}
                disabled={isBusy}
              />
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View className="flex-1 justify-center items-center px-8">
      <View className="w-24 h-24 rounded-full bg-slate-800 items-center justify-center mb-6">
        <MaterialIcons name="mail-outline" size={48} color="#64748B" />
      </View>
      <Text className="text-white text-xl font-bold text-center">No Invitations</Text>
      <Text className="text-slate-400 text-sm text-center mt-2">
        You don't have any pending invitations. Ask a restaurant owner to invite you, or create your own restaurant.
      </Text>
      <Button
        title="Create Restaurant"
        size="lg"
        onPress={() => router.push('/(admin)/restaurants/create' as any)}
        className="mt-6 w-full"
      />
    </View>
  );

  return (
    <View className="flex-1 bg-slate-900 px-5 pt-2">
      <View className="flex-row justify-between items-center mb-5">
        <Text className="text-white text-2xl font-bold">My Invitations</Text>
        <Button
          title="+ Restaurant"
          size="sm"
          variant="ghost"
          onPress={() => router.push('/(admin)/restaurants/create' as any)}
        />
      </View>

      {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitation}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={invitations.length === 0 ? { flexGrow: 1 } : { paddingBottom: 100 }}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}
