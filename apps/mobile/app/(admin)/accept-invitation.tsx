import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type MyInvitation } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { InvitationCard } from '@/components/InvitationCard';
import { useInvitationActions } from '@/lib/hooks/useInvitationActions';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

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
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-slate-800">
        <MaterialIcons name="mail-outline" size={48} color="#64748B" />
      </View>
      <Text className="text-center text-xl font-bold text-white">No Invitations</Text>
      <Text className="mt-2 text-center text-sm text-slate-400">
        You don&apos;t have any pending invitations. Ask a restaurant owner to invite you, or create
        your own restaurant.
      </Text>
      <Button
        title="Create Restaurant"
        size="lg"
        onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.CREATE as any)}
        className="mt-6 w-full"
      />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-900">
        {/* Header */}
        <View className="flex-row items-center gap-3 border-b border-slate-800 px-4 pb-4 pt-14">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-bold text-white">Invitations</Text>
          <Button
            title="+ Restaurant"
            size="sm"
            variant="ghost"
            onPress={() => router.push(ROUTES.ADMIN.RESTAURANTS.CREATE as any)}
          />
        </View>

        <View className="flex-1 px-5 pt-4">
          {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          ) : (
            <FlatList
              data={invitations}
              renderItem={renderInvitation}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                invitations.length === 0 ? { flexGrow: 1 } : { paddingBottom: 100 }
              }
              ListEmptyComponent={renderEmpty}
            />
          )}
        </View>
      </View>
    </>
  );
}
