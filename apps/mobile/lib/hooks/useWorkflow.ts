/**
 * useWorkflow — module-level cached order-flow hook.
 *
 * Design choices:
 *  - Module-level Map cache: survives component re-mounts within the same
 *    JS runtime (not cleared on navigation). TTL is 60 s.
 *  - SSE / push invalidation: subscribes to the 'workflow' refresh channel;
 *    any `workflow_changed` event clears the cache entry and triggers a
 *    fresh fetch immediately.
 *  - Hardcoded fallback: if the fetch fails the hook silently falls back to
 *    sensible defaults so the UI never crashes because of a network hiccup.
 *  - Stable callbacks: nextStatus / isTerminal are memoised with useCallback
 *    so they can safely appear in dependency arrays.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { workflowAPI, type OrderFlow } from '@/lib/api/workflow';
import { refreshEmitter } from '@/lib/realtime';

// ─── Module-level cache ──────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  data: OrderFlow;
  fetchedAt: number;
}

/** Shared across all component instances in the same JS runtime. */
const flowCache = new Map<number, CacheEntry>();

// ─── Hardcoded fallback ──────────────────────────────────────────────────────

/**
 * Used whenever the server is unreachable or returns an unexpected shape.
 * Matches the default workflow configuration created on restaurant setup.
 */
const FALLBACK: OrderFlow = {
  statuses: ['received', 'preparing', 'ready', 'served', 'paid'],
  transitions: {
    received:  'preparing',
    preparing: 'ready',
    ready:     'served',
    served:    'paid',
    paid:      null,
  },
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseWorkflowResult {
  /** Returns the status that `current` transitions to, or null if terminal. */
  nextStatus: (current: string) => string | null;
  /** Returns true when `status` has no outgoing transition (leaf node). */
  isTerminal: (status: string) => boolean;
  /** Ordered list of all statuses in the configured flow. */
  statuses: string[];
  /** True only during the initial fetch when no cached data exists yet. */
  loading: boolean;
}

export function useWorkflow(restaurantId: number): UseWorkflowResult {
  const [flow, setFlow] = useState<OrderFlow>(() => {
    // Initialise synchronously from cache if available and fresh.
    const cached = flowCache.get(restaurantId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.data;
    }
    return FALLBACK;
  });

  // Track whether we are waiting for the very first network response when
  // the cache is empty.  Re-fetches after invalidation are silent.
  const initialHasCached = (() => {
    const cached = flowCache.get(restaurantId);
    return !!(cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS);
  })();
  const [loading, setLoading] = useState<boolean>(!initialHasCached);

  // Keep a ref to the latest flow so callbacks below don't go stale.
  const flowRef = useRef<OrderFlow>(flow);
  flowRef.current = flow;

  // ── Fetch logic ─────────────────────────────────────────────────────────

  const fetchFlow = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await workflowAPI.getFlow(restaurantId);
        if (res.data) {
          flowCache.set(restaurantId, { data: res.data, fetchedAt: Date.now() });
          setFlow(res.data);
        }
      } catch (err) {
        // Network error or unexpected shape — keep current (fallback) data,
        // do NOT cache so the next mount retries immediately.
        console.warn('[useWorkflow] fetch failed, using fallback:', err);
      } finally {
        setLoading(false);
      }
    },
    [restaurantId],
  );

  // ── Mount: fetch if cache is absent or stale ─────────────────────────────

  useEffect(() => {
    const cached = flowCache.get(restaurantId);
    const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

    if (isFresh) {
      // Cache hit — update state in case a sibling component refreshed it.
      setFlow(cached.data);
      setLoading(false);
    } else {
      fetchFlow(false);
    }
  }, [restaurantId, fetchFlow]);

  // ── SSE / push invalidation ──────────────────────────────────────────────

  useEffect(() => {
    const unsub = refreshEmitter.subscribe('workflow', () => {
      // Clear the stale cache entry and re-fetch silently.
      flowCache.delete(restaurantId);
      fetchFlow(true);
    });
    return unsub;
  }, [restaurantId, fetchFlow]);

  // ── Stable derived callbacks ─────────────────────────────────────────────

  const nextStatus = useCallback(
    (current: string): string | null => flowRef.current.transitions[current] ?? null,
    [],
  );

  const isTerminal = useCallback(
    (status: string): boolean => flowRef.current.transitions[status] === null ||
      !(status in flowRef.current.transitions),
    [],
  );

  return { nextStatus, isTerminal, statuses: flow.statuses, loading };
}
