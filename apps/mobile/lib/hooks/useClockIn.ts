import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { availabilityAPI } from '@/lib/api/availability';

/**
 * Reusable clock-in / clock-out hook for all staff role pages.
 * Returns UI state + toggle handler + clockedInAt for timer.
 */
export function useClockIn(restaurantId: number) {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockedInAt, setClockedInAt] = useState<string | null>(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAvailability = useCallback(async () => {
    try {
      setChecking(true);
      const res = await availabilityAPI.getMyStatus(restaurantId);
      setIsClockedIn(res.data.isClockedIn);
      setClockedInAt(res.data.clockedInAt ?? null);
    } catch {
      // Availability might not be set up; ignore
    } finally {
      setChecking(false);
    }
  }, [restaurantId]);

  // Re-check clock status every time the screen comes into focus.
  // Handles changes made from another device / background app state.
  useFocusEffect(
    useCallback(() => {
      checkAvailability();
    }, [checkAvailability])
  );

  const handleClockToggle = useCallback(async () => {
    setClockLoading(true);
    try {
      if (isClockedIn) {
        await availabilityAPI.clockOut(restaurantId);
        setIsClockedIn(false);
        setClockedInAt(null);
      } else {
        const res = await availabilityAPI.clockIn(restaurantId);
        setIsClockedIn(true);
        setClockedInAt(res.data?.clockedInAt ?? new Date().toISOString());
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Clock action failed');
    } finally {
      setClockLoading(false);
    }
  }, [isClockedIn, restaurantId]);

  return {
    isClockedIn,
    clockedInAt,
    clockLoading,
    checking,
    handleClockToggle,
    refreshClockStatus: checkAvailability,
  };
}
