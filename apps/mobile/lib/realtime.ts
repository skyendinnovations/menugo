/**
 * Lightweight event emitter for real-time refresh coordination.
 *
 * Push notification handlers, SSE listeners, and event polling all emit
 * through this singleton.  UI components subscribe to the channels they
 * care about and refresh their data when events arrive.
 */

export type RefreshChannel =
  | 'orders'
  | 'tables'
  | 'menu'
  | 'workflow'
  | 'permissions'
  | '*';

type Listener = () => void;

class RefreshEmitter {
  private listeners = new Map<RefreshChannel, Set<Listener>>();

  /** Subscribe to a refresh channel. Returns an unsubscribe function. */
  subscribe(channel: RefreshChannel, listener: Listener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);
    return () => {
      this.listeners.get(channel)?.delete(listener);
    };
  }

  /** Emit a refresh signal on the given channel (also triggers '*' wildcard). */
  emit(channel: RefreshChannel) {
    this.listeners.get(channel)?.forEach((fn) => fn());
    if (channel !== '*') {
      this.listeners.get('*')?.forEach((fn) => fn());
    }
  }
}

/** Singleton refresh emitter shared across the app. */
export const refreshEmitter = new RefreshEmitter();

/**
 * Map a real-time event name (from SSE / push) to the refresh channels
 * that should be notified.
 */
export function eventToChannels(eventType: string): RefreshChannel[] {
  switch (eventType) {
    case 'order_placed':
    case 'order_status_changed':
    case 'order_accepted':
    case 'order_cancelled':
    case 'order_claimed':
      return ['orders'];
    case 'session_created':
    case 'session_closed':
    case 'table_status_changed':
      return ['tables'];
    case 'menu_availability_changed':
    case 'stock_updated':
      return ['menu'];
    case 'workflow_changed':
      return ['orders', 'workflow'];
    case 'permission_changed':
      return ['permissions'];
    default:
      return [];
  }
}
