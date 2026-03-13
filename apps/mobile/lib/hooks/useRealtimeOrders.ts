import { useState, useEffect, useRef, useCallback } from "react";
import { Vibration, Platform } from "react-native";
import type { Order } from "@menugo/dto";
import { refreshEmitter, type RefreshChannel } from "../realtime";

interface UseRealtimeOrdersOptions {
  /**
   * Called on each poll and real-time event. Receives an `AbortSignal` so the
   * underlying `fetch()` can be cancelled when the component unmounts or when
   * a dependency (e.g. `restaurantId`) changes mid-flight.
   */
  fetchFn: (signal: AbortSignal) => Promise<Order[]>;
  /** Polling interval in ms (default 5 000). Relaxed to 30 s when a realtime channel is set. */
  interval?: number;
  /** Whether to vibrate on new orders (default true). */
  vibrateOnNew?: boolean;
  /** Whether the hook is active (default true). */
  enabled?: boolean;
  /** Subscribe to a real-time refresh channel for immediate updates via SSE / push. */
  realtimeChannel?: RefreshChannel;
}

/** Safety-net polling interval when real-time events are active (30 s). */
const REALTIME_POLL_INTERVAL = 30_000;

/**
 * Hook that polls for orders, deduplicates concurrent fetches, cancels
 * in-flight requests on unmount, and surfaces errors to the caller.
 *
 * Hardening over the naive version:
 *  - **6.1** `isFetchingRef` guard: if a fetch is already running (SSE burst /
 *    rapid polling overlap), the new attempt is dropped silently.
 *  - **6.2** `AbortController`: a fresh controller is created per fetch.
 *    The previous controller is aborted on the next refresh start and on
 *    effect cleanup (unmount / dep change).  `AbortError` is never treated as
 *    an error state.
 *  - **6.3** `error: Error | null` in the return value.  Set on real failures;
 *    cleared on the next successful fetch.  Callers can render an error banner.
 */
export function useRealtimeOrders({
  fetchFn,
  interval = 5000,
  vibrateOnNew = true,
  enabled = true,
  realtimeChannel,
}: UseRealtimeOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const knownOrderIdsRef = useRef<Set<number>>(new Set());
  const isFirstFetchRef = useRef(true);
  /** Guards against concurrent fetches (SSE burst / rapid polling overlap). */
  const isFetchingRef = useRef(false);
  /** Controller for the currently in-flight request. */
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // 6.1 — One fetch at a time.  Drop this invocation if one is in flight.
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // 6.2 — Abort previous controller (safety net; shouldn't be needed given
    // the guard above, but ensures no two live fetch streams can exist).
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const fetched = await fetchFn(controller.signal);

      // Discard stale result if abort() was called while fetchFn was awaiting.
      if (controller.signal.aborted) return;

      // 6.3 — Clear any previous error on success.
      setError(null);
      setOrders(fetched);

      // Detect new arrivals after the first successful load.
      if (!isFirstFetchRef.current) {
        const incoming = fetched.filter(
          (o) => !knownOrderIdsRef.current.has(o.id),
        );
        if (incoming.length > 0) {
          setHasNewOrders(true);
          if (vibrateOnNew && Platform.OS !== "web") {
            Vibration.vibrate([0, 200, 100, 200]);
          }
          setTimeout(() => setHasNewOrders(false), 3000);
        }
      }

      knownOrderIdsRef.current = new Set(fetched.map((o) => o.id));
      isFirstFetchRef.current = false;
    } catch (err) {
      // 6.2 — AbortError = intentional cancellation, not a failure.
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return;
      }
      // 6.3 — Surface real errors to the caller.
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [fetchFn, vibrateOnNew]);

  // Background polling.  Interval is relaxed when a real-time channel is set.
  useEffect(() => {
    if (!enabled) return;

    refresh();
    const effectiveInterval = realtimeChannel ? REALTIME_POLL_INTERVAL : interval;
    const timer = setInterval(refresh, effectiveInterval);

    return () => {
      clearInterval(timer);
      // 6.2 — Cancel the in-flight request on unmount or dependency change.
      abortControllerRef.current?.abort();
    };
  }, [refresh, interval, enabled, realtimeChannel]);

  // Real-time subscription.
  useEffect(() => {
    if (!enabled || !realtimeChannel) return;
    return refreshEmitter.subscribe(realtimeChannel, refresh);
  }, [enabled, realtimeChannel, refresh]);

  const dismissNewOrders = useCallback(() => setHasNewOrders(false), []);
  /** Clear a stale fetch error (e.g. when the user dismisses the error banner). */
  const clearError = useCallback(() => setError(null), []);

  return { orders, loading, hasNewOrders, error, clearError, refresh, dismissNewOrders };
}
