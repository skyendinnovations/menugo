# Real-Time Architecture — FCM Push + SSE + REST Polling

> This document describes the real-time infrastructure used by MenuGo for staff dashboards, kitchen displays, waiter queues, and live table grids.

---

## Overview

MenuGo uses a **three-tier** real-time strategy:

| Tier | Transport | Use Case | Latency |
|------|-----------|----------|---------|
| **1. FCM Push** | Firebase Cloud Messaging | Mobile app wake-up & cache invalidation | ~1–3 s |
| **2. SSE** | Server-Sent Events | Always-on dashboard screens (kitchen, waiter, cashier) | ~instant |
| **3. REST Polling** | HTTP GET with cursor | Fallback when SSE is unavailable or for low-frequency screens | ~5 s |

There are **no WebSocket dependencies** in the stack.

---

## Architecture Diagram

```
┌──────────────┐    ┌──────────────────────────┐
│ Mobile App   │    │  Web Dashboard (SSE)      │
│ (FCM Push)   │    │  Kitchen / Waiter / Admin │
└──────┬───────┘    └──────────┬───────────────┘
       │                       │
       │  FCM data message     │  EventSource (text/event-stream)
       │                       │
       ▼                       ▼
┌──────────────────────────────────────────────┐
│              Express.js Backend              │
│                                              │
│   ┌────────────────┐   ┌──────────────────┐  │
│   │ Notification   │   │   EventBus       │  │
│   │ Service (FCM)  │   │  (EventEmitter)  │  │
│   └────────┬───────┘   └──────┬───────────┘  │
│            │                  │               │
│            │    emit()        │  subscribe()  │
│            │         ┌───────┐│               │
│            └─────────│Service│┘               │
│                      │ Layer │                │
│                      └───────┘                │
│                          │                    │
│                      Ring Buffer              │
│                     (per restaurant)          │
│                          │                    │
│                   GET /events/poll            │
└──────────────────────────────────────────────┘
```

---

## Event Types

All events are defined in `packages/dto/src/types/realtime.ts`.

| Event Name | Trigger | Payload |
|------------|---------|---------|
| `order_placed` | New order created | `orderId`, `orderNumber`, `tableNumber`, `sessionId`, `itemCount` |
| `order_status_changed` | Order status transition | `orderId`, `orderNumber`, `fromStatus`, `toStatus` |
| `order_accepted` | Staff accepts an order | `orderId`, `orderNumber`, `acceptedBy` |
| `order_cancelled` | Order cancelled | `orderId`, `orderNumber` |
| `session_created` | Customer opens a table session | `sessionId`, `tableId`, `tableNumber`, `personsCount`, `customerName` |
| `session_closed` | Session closed by staff | `sessionId`, `tableId`, `tableNumber`, `total` |
| `table_status_changed` | Table occupancy changed | `tableId`, `tableNumber`, `currentStatus` |
| `menu_availability_changed` | Menu item toggled on/off | `menuItemId`, `itemName`, `isAvailable` |

### Unified Event Shape

```typescript
interface RealTimeEvent {
  id: string;              // e.g. "42-17"
  event: string;           // event name from table above
  restaurantId: number;
  data: object;            // event-specific payload
  timestamp: string;       // ISO-8601
}
```

---

## 1. FCM Push Notifications

### How It Works

1. Services call `notificationService.sendOrderNotification()` after mutations.
2. The notification service looks up which **roles** are subscribed to each trigger event via the `notification_settings` table.
3. It resolves all **users** with those roles, fetches their **device tokens**, and sends an FCM multicast message.
4. Stale tokens are automatically cleaned up on delivery failure.

### Client Integration

On the mobile app, when an FCM data message arrives:

```typescript
// Invalidate relevant React Query caches
messaging().onMessage(async (remoteMessage) => {
  const { type } = remoteMessage.data;
  if (type === 'order_placed' || type === 'order_status_changed') {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
  }
});
```

### Notification Settings

- Managed via `PUT /api/restaurants/:id/notification-settings`
- Per-role, per-event enable/disable matrix
- Requires `professional` subscription tier

---

## 2. SSE (Server-Sent Events)

### Endpoint

```
GET /api/restaurants/:restaurantId/events/stream
```

**Headers Required:**
- Authentication cookie (Better Auth session) — automatically sent by browser

**Response:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`

### Event Stream Format

```
:ok

id: 42-1
event: order_placed
data: {"id":"42-1","event":"order_placed","restaurantId":42,"data":{"orderId":100,"orderNumber":"ORD-042-001","tableNumber":5,"sessionId":10,"itemCount":3},"timestamp":"2025-01-15T12:00:00.000Z"}

:keep-alive

id: 42-2
event: order_status_changed
data: {"id":"42-2","event":"order_status_changed","restaurantId":42,"data":{"orderId":100,"orderNumber":"ORD-042-001","fromStatus":"received","toStatus":"preparing"},"timestamp":"2025-01-15T12:01:00.000Z"}
```

### Keep-Alive

A `:keep-alive` comment is sent every **15 seconds** to prevent proxy/load-balancer timeouts.

### Client Usage (Browser)

```typescript
const source = new EventSource(
  '/api/restaurants/42/events/stream',
  { withCredentials: true }
);

source.addEventListener('order_placed', (e) => {
  const event = JSON.parse(e.data);
  // Update kitchen display, play sound, etc.
});

source.addEventListener('order_status_changed', (e) => {
  const event = JSON.parse(e.data);
  // Refresh order list
});

source.onerror = () => {
  // Auto-reconnect is built into EventSource
  console.warn('SSE connection lost, reconnecting...');
};
```

### Client Usage (React Native)

```typescript
import EventSource from 'react-native-sse';

const es = new EventSource(
  `${API_URL}/restaurants/${restaurantId}/events/stream`,
  { headers: { Cookie: sessionCookie } }
);

es.addEventListener('order_placed', (event) => {
  const data = JSON.parse(event.data);
  queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
});
```

### Permissions

The SSE endpoint requires `view_orders` permission. All restaurant staff members with this permission can connect.

---

## 3. REST Polling Fallback

### Endpoint

```
GET /api/restaurants/:restaurantId/events/poll?since=<ISO-8601>
```

### Response

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "42-5",
        "event": "order_placed",
        "restaurantId": 42,
        "data": { "orderId": 101, "orderNumber": "ORD-042-002" },
        "timestamp": "2025-01-15T12:05:00.000Z"
      }
    ],
    "cursor": "2025-01-15T12:05:01.000Z"
  }
}
```

### Client Usage

```typescript
const { data } = useQuery({
  queryKey: ['events', restaurantId],
  queryFn: () => api.get(`/restaurants/${restaurantId}/events/poll?since=${cursor}`),
  refetchInterval: 5000,           // Poll every 5 seconds
  refetchIntervalInBackground: false, // Only when screen is focused
});
```

### Ring Buffer

- The backend stores the **last 200 events per restaurant** in an in-memory ring buffer.
- Events older than the buffer are lost — clients should rely on React Query cache invalidation and refetch for consistency.
- The buffer is **not persisted** across server restarts (by design — events are ephemeral).

---

## EventBus Internals

The EventBus (`apps/backend/src/services/event-bus.service.ts`) is a singleton that:

1. Uses Node.js `EventEmitter` for pub/sub (one channel per restaurant).
2. Maintains a per-restaurant `RingBuffer` for polling history.
3. Assigns monotonically increasing IDs to each event.
4. Is fully in-process — no Redis dependency required for single-instance deployments.

### Scaling to Multiple Instances

For multi-instance deployments, replace the in-memory EventEmitter with **Redis Pub/Sub**:

1. On `emit()`: publish to Redis channel `restaurant:<id>`.
2. On `subscribe()`: subscribe to the same Redis channel.
3. The ring buffer can be backed by a Redis Sorted Set with TTL.

This is a future enhancement — the current architecture handles single-instance production well.

---

## Integration Points

### Where Events Are Emitted

| Service | Method | Event |
|---------|--------|-------|
| `order.service.ts` | `createOrder()` | `order_placed` |
| `order.service.ts` | `updateOrderStatus()` | `order_status_changed` / `order_cancelled` |
| `order.service.ts` | `acceptOrder()` | `order_accepted` |
| `session.service.ts` | `createSession()` | `session_created` |
| `session.service.ts` | `closeSession()` | `session_closed` |
| `menu.service.ts` | `toggleAvailability()` | `menu_availability_changed` |

### Dual Notification Path

Every mutation triggers **both**:

1. **FCM push** → wakes mobile app, shows system notification
2. **EventBus emit** → updates SSE streams and polling buffer

These are independent paths — if FCM fails, SSE still works and vice versa.

---

## Security

- SSE and polling endpoints are behind `authenticate` middleware (session cookie).
- Both require `view_orders` permission via `requirePermission` middleware.
- Events are scoped per-restaurant — a user can only subscribe to restaurants they belong to.
