import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { saveInvitationParams } from '@/lib/utils/invitation-params';

export default function InviteScreen() {
  const router = useRouter();
  const { token, email, action } = useLocalSearchParams<{
    token: string;
    email: string;
    action: 'sign-in' | 'sign-up';
  }>();

  useEffect(() => {
    async function handleInvite() {
      if (token && email) {
        await saveInvitationParams({
          token,
          email,
          action: action === 'sign-up' ? 'sign-up' : 'sign-in',
        });
      }

      const redirect = 'invitations';
      const encodedEmail = encodeURIComponent(email ?? '');

      if (action === 'sign-up') {
        router.replace(`/(auth)/sign-up?email=${encodedEmail}&redirect=${redirect}`);
      } else {
        router.replace(`/(auth)/sign-in?email=${encodedEmail}&redirect=${redirect}`);
      }
    }

    handleInvite();
  }, [token, email, action, router]);

  return (
    <View className="flex-1 items-center justify-center bg-slate-900">
      <ActivityIndicator size="large" color="#F97316" />
    </View>
  );
}
