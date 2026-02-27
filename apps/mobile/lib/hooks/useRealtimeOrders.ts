import { useState, useEffect, useRef, useCallback } from "react";
import { Vibration, Platform } from "react-native";
import type { Order } from "@menugo/dto";

interface UseRealtimeOrdersOptions {
  fetchFn: () => Promise<Order[]>;
  /** Polling interval in ms (default 5000) */
  interval?: number;
  /** Whether to vibrate on new orders (default true) */
  vibrateOnNew?: boolean;
  /** Whether the hook is active (default true) */
  enabled?: boolean;
}

/**
 * Hook that polls for orders and detects new arrivals.
 * Provides vibration feedback and a "new order" flag for visual alerts.
 */
export function useRealtimeOrders({
  fetchFn,
  interval = 5000,
  vibrateOnNew = true,
  enabled = true,
}: UseRealtimeOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const knownOrderIdsRef = useRef<Set<number>>(new Set());
  const isFirstFetchRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const fetched = await fetchFn();
      setOrders(fetched);

      // Detect new orders (only after first fetch)
      if (!isFirstFetchRef.current) {
        const newOrders = fetched.filter(
          (o) => !knownOrderIdsRef.current.has(o.id),
        );
        if (newOrders.length > 0) {
          setHasNewOrders(true);
          if (vibrateOnNew && Platform.OS !== "web") {
            Vibration.vibrate([0, 200, 100, 200]);
          }
          // Auto-dismiss after 3 seconds
          setTimeout(() => setHasNewOrders(false), 3000);
        }
      }

      // Update known IDs
      knownOrderIdsRef.current = new Set(fetched.map((o) => o.id));
      isFirstFetchRef.current = false;
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, vibrateOnNew]);

  useEffect(() => {
    if (!enabled) return;

    refresh();
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [refresh, interval, enabled]);

  const dismissNewOrders = useCallback(() => {
    setHasNewOrders(false);
  }, []);

  return {
    orders,
    loading,
    hasNewOrders,
    refresh,
    dismissNewOrders,
  };
}
