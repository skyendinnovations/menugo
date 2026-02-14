import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type MyInvitation } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { InvitationCard } from '@/components/InvitationCard';
import { useInvitationActions } from '@/lib/hooks/useInvitationActions';
import { MaterialIcons } from '@expo/vector-icons';

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
