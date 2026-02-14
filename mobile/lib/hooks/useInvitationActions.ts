import { useState } from 'react';
import { Alert as RNAlert } from 'react-native';
import { memberAPI, type MyInvitation } from '@/lib/api';

interface UseInvitationActionsOptions {
  onUpdate?: () => void;
}

export function useInvitationActions(
  setInvitations: React.Dispatch<React.SetStateAction<MyInvitation[]>>,
  options?: UseInvitationActionsOptions
) {
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const isBusy = acceptingId !== null || rejectingId !== null;

  const handleAccept = async (invitation: MyInvitation) => {
    setAcceptingId(invitation.id);
    try {
      await memberAPI.acceptInvitation(invitation.token);
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      options?.onUpdate?.();
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

  return { acceptingId, rejectingId, isBusy, handleAccept, handleReject };
}
