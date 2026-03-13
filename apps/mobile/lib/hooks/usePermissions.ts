import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI } from '@/lib/api';
import { refreshEmitter } from '@/lib/realtime';
import type { MyMembership } from '@menugo/dto';

// ─── Module-level permissions cache (6.4) ────────────────────────────────────

const CACHE_TTL_MS = 30_000;

interface PermissionEntry {
  data: MyMembership;
  fetchedAt: number;
}

/**
 * Shared across all `usePermissions` instances.
 * Key = restaurantId.  Invalidated by `permission_changed` SSE events.
 */
const permissionsCache = new Map<number, PermissionEntry>();

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current user's membership / permissions for a restaurant.
 *
 * Hardening (6.4):
 *  - **30 s module-level cache**: tab-switching and screen re-focus no longer
 *    trigger a network round-trip if the cached entry is still fresh.
 *  - **SSE invalidation**: `permission_changed` events (mapped via
 *    `eventToChannels`) bust the cache entry and trigger an immediate re-fetch
 *    so RBAC changes propagate without waiting for the TTL to expire.
 *    This keeps the hook aligned with the full RBAC permission layer.
 */
export function usePermissions(restaurantId: number) {
  const [membership, setMembership] = useState<MyMembership | null>(() => {
    const cached = permissionsCache.get(restaurantId);
    return cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS
      ? cached.data
      : null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    const cached = permissionsCache.get(restaurantId);
    return !(cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS);
  });

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await memberAPI.getMyMembership(restaurantId);
      if (res.data) {
        permissionsCache.set(restaurantId, {
          data: res.data,
          fetchedAt: Date.now(),
        });
        setMembership(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // On screen focus: serve from cache when fresh; re-fetch when stale.
  useFocusEffect(
    useCallback(() => {
      const cached = permissionsCache.get(restaurantId);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        // Cache hit — sync local state in case a sibling component refreshed it.
        setMembership(cached.data);
        setLoading(false);
        return;
      }
      fetchPermissions();
    }, [restaurantId, fetchPermissions])
  );

  // SSE invalidation: bust the cache entry and immediately re-fetch so the
  // UI never serves stale permissions after an RBAC change on the server.
  useEffect(() => {
    return refreshEmitter.subscribe('permissions', () => {
      permissionsCache.delete(restaurantId);
      fetchPermissions();
    });
  }, [restaurantId, fetchPermissions]);

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
    roles: membership?.roles ?? [],
    membership,
    loading,
    hasPermission,
  };
}
