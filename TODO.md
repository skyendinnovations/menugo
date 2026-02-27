# MenuGo — Pending Tasks

> Updated: 2026-02-27
> **Backend is 100% complete.** All remaining work is on the mobile app.

---

## Status Summary

| Layer | Done | Remaining |
|-------|------|-----------|
| **Backend** (schema, services, APIs) | ✅ 100% | Nothing |
| **Mobile — Admin screens** | ~75% | Workflow config, stock mgmt, super admin |
| **Mobile — Staff screens** | ~85% | Void UI, force-release UI, resend notification |
| **Mobile — API client** | ✅ 100% | Done |
| **Mobile — Real-time** | ~40% | SSE client, FCM push handler, customer alerts |

---

## Section 1: ~~Missing~~ API Client Methods ✅

> **File locations:** `apps/mobile/lib/api/`

### 1.1 — `order.ts` — Add missing methods ✅
- [x] `voidOrder(restaurantId, orderId, reason)` → `POST /api/restaurants/:id/orders/:orderId/void`
- [x] `modifyOrderItem(restaurantId, orderId, itemId, data)` → `PUT /api/restaurants/:id/orders/:orderId/items/:itemId`
- [x] `claimOrder(restaurantId, orderId)` → `POST /api/restaurants/:id/orders/:orderId/claim`
- [x] `resendNotification(restaurantId, orderId)` → `POST /api/restaurants/:id/orders/:orderId/resend-notification`

### 1.2 — `table.ts` — Add missing method ✅
- [x] `forceRelease(restaurantId, tableId, reason)` → `POST /api/restaurants/:id/tables/:tableId/force-release`

### 1.3 — `restaurant.ts` — Add missing method ✅
- [x] `updateWorkflowMode(id, mode)` → `PUT /api/restaurants/:id/workflow-mode` (modes: `full_service` | `fast_service` | `self_service`)

### 1.4 — `menu.ts` — Add missing stock methods ✅
- [x] `updateItemStock(restaurantId, itemId, stockCount)` → `PUT /api/restaurants/:id/menu/items/:itemId/stock`
- [x] `toggleItemSoldOut(restaurantId, itemId, isSoldOut)` → `PUT /api/restaurants/:id/menu/items/:itemId/sold-out`
- [x] `updateVariantStock(restaurantId, variantId, stockCount)` → `PUT /api/restaurants/:id/menu/variants/:variantId/stock`
- [x] `toggleVariantSoldOut(restaurantId, variantId, isSoldOut)` → `PUT /api/restaurants/:id/menu/variants/:variantId/sold-out`

### 1.5 — New file: `workflow.ts` ✅
- [x] Create `apps/mobile/lib/api/workflow.ts`
- [x] `getWorkflows(restaurantId)` → `GET /api/restaurants/:id/workflows`
- [x] `updateWorkflows(restaurantId, transitions)` → `PUT /api/restaurants/:id/workflows`
- [x] Export `workflowAPI` instance and add to `apps/mobile/lib/api/index.ts`

### 1.6 — New file: `admin.ts` ✅
- [x] Create `apps/mobile/lib/api/admin.ts`
- [x] `getRestaurants(query?)` → `GET /api/admin/restaurants`
- [x] `suspendRestaurant(id, reason)` → `PUT /api/admin/restaurants/:id/suspend`
- [x] `activateRestaurant(id, reason?)` → `PUT /api/admin/restaurants/:id/activate`
- [x] `getUsers(query?)` → `GET /api/admin/users`
- [x] `banUser(id, reason)` → `PUT /api/admin/users/:id/ban`
- [x] `unbanUser(id, reason?)` → `PUT /api/admin/users/:id/unban`
- [x] Export `adminAPI` instance and add to `apps/mobile/lib/api/index.ts`

---

## Section 2: Missing Admin Screens

> **File locations:** `apps/mobile/app/(admin)/restaurants/[id]/`

### 2.1 — Workflow mode selector in restaurant edit screen
- [ ] **File:** `apps/mobile/app/(admin)/restaurants/[id]/edit.tsx`
- [ ] Add a segmented control / radio group for `workflow_mode`: Full Service | Fast Service | Self Service
- [ ] On change, call `restaurantAPI.updateWorkflowMode(id, mode)`
- [ ] Show description of each mode:
  - **Full Service** — Kitchen notifies available waiter only
  - **Fast Service** — All waiters notified, first to accept wins
  - **Self Service** — Customer notified directly when order is ready

### 2.2 — Workflow configuration screen (new screen)
- [ ] **File:** `apps/mobile/app/(admin)/restaurants/[id]/workflows.tsx`
- [ ] List all order state transitions (from_state → to_state → required permission)
- [ ] Allow toggling transitions on/off
- [ ] Add card link on the restaurant dashboard `apps/mobile/app/(admin)/restaurants/[id]/index.tsx`
- [ ] Guard: only show for users with `MANAGE_WORKFLOWS` permission

### 2.3 — Stock / inventory management screen (new screen)
- [ ] **File:** `apps/mobile/app/(admin)/restaurants/[id]/stock.tsx`
- [ ] List all menu items and variants with current stock status
- [ ] Toggle "Sold Out" per item / variant
- [ ] Set stock count (numeric input) per item / variant
- [ ] Items with `stock_count = 0` highlighted in red
- [ ] Add card link on the restaurant dashboard
- [ ] Guard: only show for users with `MANAGE_STOCK` permission

### 2.4 — Super admin panel (new screen)
- [ ] **File:** `apps/mobile/app/(admin)/super-admin.tsx`
- [ ] Accessible only when `user.globalRole === 'SUPER_ADMIN'`
- [ ] Platform stats dashboard (total restaurants, users, active sessions)
- [ ] Scrollable list of all restaurants with status badges
- [ ] Suspend / Activate action per restaurant (with confirmation dialog)
- [ ] User list with ban / unban actions
- [ ] Add link from `apps/mobile/app/(admin)/index.tsx` (show only for super admin)

---

## Section 3: Missing Staff Screen Actions

### 3.1 — Order void / cancel UI
- [ ] **File:** `apps/mobile/app/(admin)/restaurants/[id]/orders/index.tsx`
- [ ] Add "Void Order" button on order cards (visible only if order is in `received` or `preparing` state)
- [ ] Guard: requires `MODIFY_ORDER` permission
- [ ] Show confirmation dialog with a mandatory `reason` text input
- [ ] Call `orderAPI.voidOrder(restaurantId, orderId, reason)` on confirm
- [ ] Refresh order list on success; show error toast on failure

### 3.2 — Order item modification UI
- [ ] **File:** `apps/mobile/app/(admin)/restaurants/[id]/orders/index.tsx`
- [ ] In order detail view, allow quantity changes and item removal while order is in `received` state
- [ ] Guard: requires `MODIFY_ORDER` permission
- [ ] Call `orderAPI.modifyOrderItem(restaurantId, orderId, itemId, { qty })` on save
- [ ] Refresh order on success

### 3.3 — Table force-release UI
- [ ] **File:** `apps/mobile/app/(admin)/restaurants/[id]/helper.tsx`
- [ ] Add a "Force Release" action on occupied/blocked table cards
- [ ] Guard: requires `TABLE_FORCE_RELEASE` permission
- [ ] Show confirmation dialog with a mandatory `reason` text input
- [ ] Call `tableAPI.forceRelease(restaurantId, tableId, reason)` on confirm
- [ ] Refresh table grid on success

### 3.4 — Resend notification button
- [ ] **File:** `apps/mobile/app/(admin)/restaurants/[id]/kitchen.tsx` and/or orders screen
- [ ] Add a re-send push button on order cards for managers (3-dot menu or long press)
- [ ] Guard: requires `RESEND_NOTIFICATION` permission
- [ ] Call `orderAPI.resendNotification(restaurantId, orderId)` on tap
- [ ] Show success/error toast feedback

---

## Section 4: Real-Time Integration

### 4.1 — FCM push → React Query cache invalidation
- [ ] **File:** `apps/mobile/app/_layout.tsx` or a new `apps/mobile/lib/hooks/usePushHandler.ts`
- [ ] Add an `onMessage` listener for foreground FCM messages in the root layout
- [ ] On message, parse the `type` field from the notification data payload
- [ ] Invalidate the matching React Query key:
  - `ORDER_PLACED`, `ORDER_STATUS_CHANGED`, `ORDER_CLAIMED` → invalidate `['orders', restaurantId]`
  - `TABLE_STATUS_CHANGED`, `TABLE_CLOSED` → invalidate `['tables', restaurantId]`
  - `STOCK_UPDATED` → invalidate `['menu', restaurantId]`
- [ ] This reduces polling dependency across all staff screens

### 4.2 — Customer push notification handling
- [ ] **File:** `apps/mobile/app/order/[slug]/[table]/index.tsx`
- [ ] Add an `onMessage` / `onNotificationOpenedApp` listener scoped to active customer sessions
- [ ] When `ORDER_STATUS_CHANGED` with status `PREPARED` arrives (self-service mode) → show in-app alert: "Your order is ready for pickup!"
- [ ] Auto-refresh the order list when any relevant push arrives
- [ ] No listener required if group session token is expired/closed

### 4.3 — SSE client integration (optional enhancement)
- [ ] Install `react-native-sse` or equivalent package
- [ ] Create `apps/mobile/lib/hooks/useSSE.ts` hook that connects to `GET /api/restaurants/:id/events/stream`
- [ ] Replace the 5s polling in `useRealtimeOrders` with SSE subscription on always-on screens (kitchen, helper)
- [ ] Fall back to polling if SSE connection drops or is unsupported on platform

---

## Priority Order

| Priority | Task | Effort |
|----------|------|--------|
| 🔴 P0 | 1.1 — Add void, modify, claim, resend to `order.ts` | Small |
| 🔴 P0 | 1.2 — Add `forceRelease` to `table.ts` | Small |
| 🔴 P0 | 3.1 — Order void UI (dialog + reason) | Small |
| 🔴 P0 | 3.3 — Table force-release UI (dialog + reason) | Small |
| 🟠 P1 | 1.3 — Add `updateWorkflowMode` to `restaurant.ts` | Small |
| 🟠 P1 | 1.4 — Add stock methods to `menu.ts` | Small |
| 🟠 P1 | 2.1 — Workflow mode selector in edit screen | Small |
| 🟠 P1 | 2.3 — Stock management screen | Medium |
| 🟠 P1 | 4.1 — FCM push → cache invalidation | Medium |
| 🟠 P1 | 4.2 — Customer push handling | Small |
| 🟡 P2 | 1.5 — New `workflow.ts` API client | Small |
| 🟡 P2 | 2.2 — Workflow configuration screen | Medium |
| 🟡 P2 | 3.2 — Order item modification UI | Small |
| 🟡 P2 | 3.4 — Resend notification button | Small |
| 🟢 P3 | 1.6 — New `admin.ts` API client | Small |
| 🟢 P3 | 2.4 — Super admin panel screen | Large |
| 🟢 P3 | 4.3 — SSE client (replaces polling) | Medium |
