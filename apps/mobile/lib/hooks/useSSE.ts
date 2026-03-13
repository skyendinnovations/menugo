import { useEffect, useRef, useState } from 'react';
import { refreshEmitter, eventToChannels } from '../realtime';
import BaseAPI from '../api/base';
import type { RealTimeEvent } from '@menugo/dto';

// ─── Lightweight API client for event polling ───────────────────────

class EventsAPI extends BaseAPI {
  async pollEvents(restaurantId: number, since: string) {
    return this.get<{
      success: boolean;
      data: { events: RealTimeEvent[]; cursor: string };
    }>(`/api/restaurants/${restaurantId}/events/poll?since=${encodeURIComponent(since)}`);
  }
}

const eventsAPI = new EventsAPI();

/** Default polling interval (ms). */
const POLL_INTERVAL = 3_000;
/** Interval after an error (ms). */
const ERROR_INTERVAL = 10_000;

/**
 * Hook that polls the backend event stream for a restaurant and emits
 * refresh signals through the global `refreshEmitter`.
 *
 * Screens that use `useRealtimeOrders` with a `realtimeChannel` will
 * automatically react to these signals, reducing their own polling to a
 * 30-second safety net.
 */
export function useSSE(restaurantId: number, enabled = true) {
  const cursorRef = useRef<string>(new Date().toISOString());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !restaurantId) return;

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    cursorRef.current = new Date().toISOString();

    const poll = async () => {
      if (stopped) return;

      let nextDelay = POLL_INTERVAL;

      try {
        const res = await eventsAPI.pollEvents(restaurantId, cursorRef.current);
        if (stopped) return;

        setConnected(true);
        cursorRef.current = res.data.cursor;

        for (const event of res.data.events) {
          const channels = eventToChannels(event.event);
          channels.forEach((ch) => refreshEmitter.emit(ch));
        }
      } catch {
        if (!stopped) setConnected(false);
        nextDelay = ERROR_INTERVAL;
      }

      if (!stopped) {
        timeoutId = setTimeout(poll, nextDelay);
      }
    };

    poll();

    return () => {
      stopped = true;
      clearTimeout(timeoutId);
      setConnected(false);
    };
  }, [restaurantId, enabled]);

  return { connected };
}
