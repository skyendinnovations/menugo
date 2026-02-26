// ─── Real-Time Event Types ──────────────────────────────────────────
// Shared types for SSE streaming, FCM push, and REST polling.

/**
 * All real-time event names emitted by the backend.
 * Used by SSE, FCM data payloads, and polling responses.
 */
export const REALTIME_EVENT_NAMES = [
  "order_placed",
  "order_status_changed",
  "order_accepted",
  "order_cancelled",
  "order_claimed",
  "session_created",
  "session_closed",
  "table_status_changed",
  "menu_availability_changed",
  "workflow_changed",
  "stock_updated",
] as const;

export type RealTimeEventName = (typeof REALTIME_EVENT_NAMES)[number];

// ─── Event Payloads ─────────────────────────────────────────────────

export interface OrderPlacedPayload {
  orderId: number;
  orderNumber: string;
  tableNumber?: number;
  sessionId: number;
  itemCount: number;
}

export interface OrderStatusChangedPayload {
  orderId: number;
  orderNumber: string;
  fromStatus: string;
  toStatus: string;
  tableNumber?: number;
}

export interface OrderAcceptedPayload {
  orderId: number;
  orderNumber: string;
  acceptedBy: string;
  acceptedByName?: string;
}

export interface OrderCancelledPayload {
  orderId: number;
  orderNumber: string;
  tableNumber?: number;
}

export interface OrderClaimedPayload {
  orderId: number;
  orderNumber: string;
  claimedBy: string;
  claimedByName?: string;
}

export interface SessionCreatedPayload {
  sessionId: number;
  tableId: number;
  tableNumber: number;
  personsCount: number;
  customerName: string;
}

export interface SessionClosedPayload {
  sessionId: number;
  tableId: number;
  tableNumber?: number;
  total?: string;
}

export interface TableStatusChangedPayload {
  tableId: number;
  tableNumber: number;
  previousStatus?: string;
  currentStatus: string;
}

export interface MenuAvailabilityChangedPayload {
  menuItemId: number;
  itemName: string;
  isAvailable: boolean;
  categoryId?: number;
}

export interface WorkflowChangedPayload {
  transitionCount: number;
}

export interface StockUpdatedPayload {
  menuItemId: number;
  itemName: string;
  variantId?: number;
  variantName?: string;
  stockCount: number | null;
  isSoldOut: boolean;
}

// ─── Payload Map ────────────────────────────────────────────────────

export interface RealTimeEventPayloadMap {
  order_placed: OrderPlacedPayload;
  order_status_changed: OrderStatusChangedPayload;
  order_accepted: OrderAcceptedPayload;
  order_cancelled: OrderCancelledPayload;
  order_claimed: OrderClaimedPayload;
  session_created: SessionCreatedPayload;
  session_closed: SessionClosedPayload;
  table_status_changed: TableStatusChangedPayload;
  menu_availability_changed: MenuAvailabilityChangedPayload;
  workflow_changed: WorkflowChangedPayload;
  stock_updated: StockUpdatedPayload;
}

// ─── Unified Real-Time Event ────────────────────────────────────────

/**
 * The unified shape of a real-time event used across
 * SSE, FCM data payloads, and the polling endpoint.
 */
export interface RealTimeEvent<
  T extends RealTimeEventName = RealTimeEventName,
> {
  /** Unique event id (monotonic within a restaurant). */
  id: string;
  /** The event name / type. */
  event: T;
  /** Restaurant this event belongs to. */
  restaurantId: number;
  /** The event payload – shape depends on `event`. */
  data: RealTimeEventPayloadMap[T];
  /** ISO-8601 timestamp of when the event was emitted. */
  timestamp: string;
}

/**
 * Response shape for the polling endpoint
 * `GET /restaurants/:id/events/poll?since=...`
 */
export interface PollEventsResponse {
  events: RealTimeEvent[];
  /** ISO-8601 timestamp to pass as `since` in the next poll. */
  cursor: string;
}
