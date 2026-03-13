import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI } from '@/lib/api';

export interface MembershipStatus {
  isOwner: boolean;
  isStaff: boolean;
  staffRestaurantId: number | null;
  totalMemberships: number;
}

/**
 * Hook to fetch the current user's global membership status.
 *
 * - `isStaff` — user has a non-owner membership somewhere (cannot create restaurants)
 * - `isOwner` — user owns at least one restaurant
 * - `staffRestaurantId` — the restaurant ID of their staff membership (if any)
 * - `canCreateRestaurant` — convenience flag: not a staff member
 */
export function useMembershipStatus() {
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          const res = await memberAPI.getMembershipStatus();
          if (!cancelled) setStatus(res.data);
        } catch (error) {
          console.error('Failed to fetch membership status:', error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return {
    ...status,
    loading,
    canCreateRestaurant: status ? !status.isStaff : true,
  };
}
