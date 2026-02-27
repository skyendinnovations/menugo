import { useState, useEffect, useCallback } from 'react';
import { restaurantAPI, type Restaurant } from '@/lib/api';

/**
 * Hook to check if a restaurant is in demo/training mode.
 * Returns the demo state and helpers to toggle/reset demo data.
 */
export function useDemoMode(restaurantId: number) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkDemoMode = useCallback(async () => {
    try {
      const res = await restaurantAPI.getById(restaurantId);
      setIsDemoMode(!!res.data.isDemoMode);
    } catch {
      // Ignore — default to false
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    checkDemoMode();
  }, [checkDemoMode]);

  const toggleDemoMode = useCallback(
    async (enabled: boolean) => {
      const res = await restaurantAPI.toggleDemoMode(restaurantId, enabled);
      setIsDemoMode(!!res.data.isDemoMode);
      return res;
    },
    [restaurantId],
  );

  const resetDemoData = useCallback(async () => {
    return restaurantAPI.resetDemoData(restaurantId);
  }, [restaurantId]);

  return { isDemoMode, loading, toggleDemoMode, resetDemoData, refresh: checkDemoMode };
}
