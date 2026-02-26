import { EventEmitter } from "events";
import { logger } from "../utils/logger";
import type {
  RealTimeEvent,
  RealTimeEventName,
  RealTimeEventPayloadMap,
} from "@menugo/dto";

// ─── Types ──────────────────────────────────────────────────────────

type EventHandler = (event: RealTimeEvent) => void;

// ─── Ring Buffer (per-restaurant event history for polling) ─────────

const RING_BUFFER_SIZE = 200;

/** Circular buffer that stores the last N events per restaurant. */
class RingBuffer {
  private readonly buffer: RealTimeEvent[] = [];
  private head = 0;
  private count = 0;

  push(event: RealTimeEvent): void {
    if (this.count < RING_BUFFER_SIZE) {
      this.buffer.push(event);
      this.count++;
    } else {
      this.buffer[this.head] = event;
    }
    this.head = (this.head + 1) % RING_BUFFER_SIZE;
  }

  /**
   * Return all events with a timestamp strictly greater than `since`.
   * Events are returned in chronological order.
   */
  since(sinceISO: string): RealTimeEvent[] {
    const sinceMs = new Date(sinceISO).getTime();
    const ordered = this.toArray();
    return ordered.filter((e) => new Date(e.timestamp).getTime() > sinceMs);
  }

  /** Return all buffered events in chronological order. */
  private toArray(): RealTimeEvent[] {
    if (this.count < RING_BUFFER_SIZE) {
      return this.buffer.slice();
    }
    // Wrap around
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ];
  }
}

// ─── EventBus ───────────────────────────────────────────────────────

/** Monotonically increasing global counter used for event IDs. */
let _seq = 0;

class EventBus {
  private readonly emitter = new EventEmitter();
  private readonly buffers = new Map<number, RingBuffer>();

  constructor() {
    // Allow many SSE listeners per restaurant without warning.
    this.emitter.setMaxListeners(0);
  }

  // ─── Emit ───────────────────────────────────────────────────────

  /**
   * Emit a real-time event for a restaurant.
   * This pushes to the ring buffer AND notifies all active SSE subscribers.
   */
  emit<T extends RealTimeEventName>(
    restaurantId: number,
    eventName: T,
    data: RealTimeEventPayloadMap[T],
  ): RealTimeEvent<T> {
    _seq++;
    const event: RealTimeEvent<T> = {
      id: `${restaurantId}-${_seq}`,
      event: eventName,
      restaurantId,
      data,
      timestamp: new Date().toISOString(),
    };

    // Store in ring buffer
    this.getBuffer(restaurantId).push(event as RealTimeEvent);

    // Broadcast to SSE subscribers
    const channel = this.channel(restaurantId);
    this.emitter.emit(channel, event);

    logger.debug(
      `EventBus: emitted ${eventName} for restaurant ${restaurantId} (id=${event.id})`,
    );

    return event;
  }

  // ─── Subscribe / Unsubscribe (SSE) ─────────────────────────────

  /**
   * Subscribe to real-time events for a restaurant.
   * Returns an unsubscribe function.
   */
  subscribe(restaurantId: number, handler: EventHandler): () => void {
    const channel = this.channel(restaurantId);
    this.emitter.on(channel, handler);
    logger.debug(
      `EventBus: new subscriber for restaurant ${restaurantId} (total=${this.emitter.listenerCount(channel)})`,
    );

    return () => {
      this.emitter.off(channel, handler);
      logger.debug(
        `EventBus: subscriber removed for restaurant ${restaurantId} (total=${this.emitter.listenerCount(channel)})`,
      );
    };
  }

  // ─── Polling ──────────────────────────────────────────────────

  /**
   * Get events since a given timestamp for polling clients.
   * Returns events in chronological order.
   */
  getEventsSince(restaurantId: number, sinceISO: string): RealTimeEvent[] {
    return this.getBuffer(restaurantId).since(sinceISO);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private channel(restaurantId: number): string {
    return `restaurant:${restaurantId}`;
  }

  private getBuffer(restaurantId: number): RingBuffer {
    let buf = this.buffers.get(restaurantId);
    if (!buf) {
      buf = new RingBuffer();
      this.buffers.set(restaurantId, buf);
    }
    return buf;
  }
}

/** Singleton event bus used across the application. */
export const eventBus = new EventBus();
