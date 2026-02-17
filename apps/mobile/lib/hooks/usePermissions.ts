import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI } from '@/lib/api';
import type { MyMembership } from '@menugo/dto';

export function usePermissions(restaurantId: number) {
  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          const res = await memberAPI.getMyMembership(restaurantId);
          if (!cancelled) setMembership(res.data);
        } catch (error) {
          console.error('Failed to fetch permissions:', error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [restaurantId])
  );

  const hasPermission = useCallback(
    (key: string) => {
      if (!membership) return false;
      if (membership.isOwner) return true;
      return membership.permissions[key] === true;
    },
    [membership]
  );

  return {
    permissions: membership?.permissions ?? {},
    isOwner: membership?.isOwner ?? false,
    loading,
    hasPermission,
  };
}
