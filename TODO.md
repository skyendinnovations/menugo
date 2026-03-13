# MenuGo — Order / Notification / RBAC Staff Rewrite Plan

## Core Design Principle

`staff.tsx` is a SINGLE screen. It is the universal staff dashboard.
What a user sees is determined ENTIRELY by their permissions — never by role name.
A role is just a named bundle of permissions. New roles work automatically with zero code changes.

```
Permission → Section visible
─────────────────────────────────────────────────────
order_prepare              → Kitchen kanban
order_deliver              → Delivery / claim list
close_sessions             → Cashier (sessions + bill)
helper_block_table
  OR table_force_release   → Tables management
view_orders
  OR update_orders
  OR modify_order          → Orders overview
  (only when no kitchen/delivery perm — avoids duplicate)
```

---

## What's Wrong Today (Root Cause Analysis)

### Backend
1. **Permission middleware duplicates DB work** — `requirePermission` and
   `requireAnyPermission` each do 2 separate DB queries (super-admin check + role
   fetch). No shared `resolvePermissions()` helper exists.
2. **`OrderService` is a 727-line god object** — order CRUD, stock loops, workflow
   validation, notification dispatch, eventBus, and audit logging all in one class.
3. **Double permission check** — route middleware enforces permissions, then
   `workflowService.validateTransition` re-checks for the same actor. Redundant
   DB round trip + inconsistent error messages.
4. **Notification routing split across two services** — `WorkflowNotificationService`
   calls `NotificationService` as a fallback. Boundaries are unclear; logic bleeds
   both ways.
5. **Hardcoded `_to_ready` string match** — custom workflows that skip `ready`
   or add extra steps break notification routing silently.
6. **`GET /orders` accepts 4 different permissions** — over-permissive, returns
   inconsistent data shapes depending on caller.
7. **`resendNotification` reverse-engineers the workflow** — searches
   `flow.transitions` backward instead of reading a stored `lastTriggerEvent`.
8. **No restaurant-ownership guard on `GET /orders/:id`** — any user with
   `view_orders` can read any order by ID across restaurants.

### Mobile
1. **`staff.tsx` is 1459 lines** — all section components, modals, state, and the
   tab bar co-located. Hard to read, maintain, or test.
2. **Hardcoded transition maps in the UI** — `KitchenSection` and `OrdersSection`
   both hardcode `{ received→preparing→ready→served }`. Custom workflows (e.g.
   no kitchen step, or extra QC step) are silently ignored.
3. **No `useWorkflow` hook** — the app never fetches the restaurant's actual
   configured transitions. Advance buttons are always shown for the hardcoded
   next step regardless of what the workflow says.
4. **`useRealtimeOrders` fires concurrent fetches** — rapid SSE events trigger
   multiple in-flight requests with no deduplication or abort.
5. **`usePermissions` has no cache** — re-fetches on every screen focus.
6. **Errors are swallowed** — `useRealtimeOrders` catches and console.errors only.
   Users never see fetch failures.

---

## Implementation Plan

---

### Part 1 — Permission Layer Consolidation (Backend) ✅ COMPLETE
**Goal:** One DB round trip per request. No copy-pasted middleware code.

- [x] **1.1** Created `src/utils/resolve-permissions.ts` — pure async function:
  ```ts
  resolvePermissions(userId, restaurantId): Promise<ResolvedPermissions>
  ```
  Two DB queries max (user+restaurant_members LEFT JOIN, then userRoles+roles INNER JOIN).
  Super-admins short-circuit after query 1. Result is cached on `req.resolvedPermissions`.

- [x] **1.2** Rewrote `requirePermission` — calls `resolvePermissions` via shared
  `getResolved()` helper. Zero duplicate DB queries. Checks isSuperAdmin → isOwner →
  isMember → hasAll(permissions).

- [x] **1.3** Rewrote `requireAnyPermission` — reads `req.resolvedPermissions` cache
  if already populated. Checks isSuperAdmin → isOwner → isMember → hasAny(permissions).

- [x] **1.4** Rewrote `requireMembership` — uses same `getResolved()` helper.
  Checks isSuperAdmin || isMember.

- [x] **1.5** Added `resolvedPermissions` to Express `Request` type augmentation
  (`src/types/express.d.ts`). Used inline `import("@menugo/dto").Permissions` to avoid
  `.d.ts` module boundary issues.

- [ ] **1.6** Unit tests: owner bypass, super-admin bypass, merged multi-role
  permissions, non-member 403.

---

### Part 2 — Order Service Decomposition (Backend) ✅ COMPLETE
**Goal:** Each class does one thing. `OrderService` becomes an orchestrator only.

- [x] **2.1** Created `src/services/stock-adjustment.service.ts` (`StockAdjustmentService`):
  - `decrementForOrder(items, restaurantId)` — called on order create (fire-and-forget)
  - `restoreForItems(items, restaurantId)` — called on void (awaited for correctness)
  - `adjustForQuantityChange(item, restaurantId)` — called on item edit (throws on insufficient stock)
  `OrderService` now delegates all stock loops here.

- [x] **2.2** Created `src/services/order-audit.service.ts` (`OrderAuditService`) —
  typed fire-and-forget wrappers: `logStatusChange`, `logVoid`, `logClaim`,
  `logItemEdit`, `logResend`. Each calls `.catch(() => {})` internally.
  `AuditContext` interface moved to `src/types/index.ts` (single definition).

- [x] **2.3** Rewrote `OrderService.updateOrderStatus`:
  - No `actorUserId` permission re-check (middleware enforces it)
  - `workflowService.validateTransition(restaurantId, from, to)` — 3 args only
  - Uses `orderRepository.updateStatusAndTrigger` (sets `lastTriggerEvent` atomically)
  - All side-effects delegated to `orderAuditService` and `workflowNotificationService`

- [x] **2.4** Rewrote `voidOrder` — calls `StockAdjustmentService.restoreForItems`.
  All inline item/stock loops removed.

- [x] **2.5** Rewrote `updateOrderItem` — calls
  `StockAdjustmentService.adjustForQuantityChange`. All inline stock diff logic removed.

- [x] **2.6** `getOrderById(id, restaurantId)` — added restaurant ownership guard (403).
  Updated `order.controller.ts` to pass `restaurantId`.

- [x] **2.7** Added `lastTriggerEvent TEXT` column to `orders` schema.
  - Migration: `packages/data/src/drizzle/0009_add_order_last_trigger_event.sql`
  - Set to `"order_placed"` in `createOrder`
  - Set atomically via `updateStatusAndTrigger` in `updateOrderStatus`
  - `resendNotification` reads `order.lastTriggerEvent` directly — no workflow reverse lookup.
  - Backward compat: falls back to status-derived event for legacy `NULL` rows.

- [x] Removed duplicate `getMergedPermissions` from `workflow.service.ts`.
  Removed `actorUserId` parameter from `validateTransition` (permission checks belong in middleware).
  Fixed pre-existing `inArray` enum type error in `order.repository.ts`.

---

### Part 3 — Notification Orchestration Rewrite (Backend) ✅
**Goal:** One clear path from order event to push token. No forked service calls.

- [x] **3.1** Delete `workflow-notification.service.ts`. Create
  `src/services/notification-orchestrator.service.ts` with one public method:
  ```ts
  dispatch(restaurantId, triggerEvent, payload, sseContext?): Promise<void>
  ```

- [x] **3.2** Routing strategy (first match wins):
  ```
  1. demo mode?                                                → return early (no push)
  2. self_service  + isCustomerNotifyStep transition?          → sendToCustomerDevice
  3. full_service  + isCustomerNotifyStep transition?          → sendToAvailableWaiters
                                                                 (fallback: sendToAllClockedIn)
  4. fast_service  + triggerEvent === "order_placed"?          → sendToAllClockedIn
  5. default                                                   → sendByRoleSettings
  ```

- [x] **3.3** Four private strategy methods:
  `sendToCustomerDevice`, `sendToAvailableWaiters`, `sendToAllClockedIn`,
  `sendByRoleSettings`. Each records a `routingStrategy` label in `notification_log`.

- [x] **3.4** `sendByRoleSettings` — recipient resolution via:
  ```ts
  NotificationSettingsRepository.findRecipientsForEvent(
    restaurantId, triggerEvent
  ): Promise<string[]>   // userId[]
  ```
  Single JOIN query (notificationSettings → userRoles → staffAvailability) instead of 3 separate queries.

- [x] **3.5** Shared `sendPush(tokenRecords, title, body, data)` private helper —
  routes web→FCM, native→Expo. Handles stale token cleanup. Used by all strategies.

- [x] **3.6** Removed all `eventBus.emit` calls from `OrderService`. Moved them into
  `NotificationOrchestrator.dispatch` so SSE event emission and push always happen
  together in one place.

- [x] **3.7** Replaced hardcoded `_to_ready` heuristic with a real workflow query:
  ```ts
  workflowRepository.findCustomerNotifyToStates(restaurantId): Promise<string[]>
  ```
  Added `isCustomerNotifyStep BOOLEAN` to `restaurant_workflows` table.
  Migration `0010_add_workflow_customer_notify_step.sql` backfills `→ ready` transitions.

- [ ] **3.8** Integration tests per `workflowMode` + custom workflow:
  assert correct strategy selected, `notification_log` row created with right
  `routingStrategy`. *(deferred)*

---

### Part 4 — Order Route Cleanup (Backend) ✅
**Goal:** One permission, one data shape, one purpose per endpoint.

- [x] **4.1** Remove the generic `GET /orders` (the over-permissive list).
  Replaced with purpose-built read endpoints:

  | Route                    | Permission       | Data returned                                     |
  |--------------------------|------------------|---------------------------------------------------|
  | `GET /orders/kitchen`    | `order_prepare`  | Full orders with items, status ∈ {received,preparing,ready} |
  | `GET /orders/delivery`   | `order_deliver`  | Orders ready for claim/deliver (workflow-driven)  |
  | `GET /orders/cashier`    | `close_sessions` | Orders grouped by active session (for bill modal) |
  | `GET /orders/overview`   | `view_orders`    | Minimal fields only — no `items` array            |

- [x] **4.2** `GET /orders/:orderId` — `requireAnyPermission(view_orders,
  order_prepare, order_deliver, close_sessions)`. Restaurant-ownership check enforced by service.

- [x] **4.3** `PATCH /orders/:orderId/status` — `view_orders` was not present.
  Confirmed: `update_orders`, `order_prepare`, `order_deliver` only.

- [x] **4.4** `POST /orders/:orderId/accept` — `requireAnyPermission(update_orders,
  order_prepare, order_deliver)`. Unchanged.

- [x] **4.5** Exposed `GET /restaurants/:restaurantId/workflows/flow` guarded by
  `requireMembership`. Returns `{ transitions: Record<string,string|null>,
  statuses: string[] }`. Used by the `useWorkflow` hook on mobile.

- [ ] **4.6** Permission-matrix integration tests for every endpoint:
  correct perm → 200, wrong perm → 403, non-member → 403. *(deferred)*

---

### Part 5 — `useWorkflow` Hook (Mobile) ✅
**Goal:** UI respects the restaurant's actual configured order flow. Zero hardcoded maps.

- [x] **5.1** Add `workflowAPI.getFlow(restaurantId)` to the mobile API client
  (`lib/api/workflow.ts`).

- [x] **5.2** Create `lib/hooks/useWorkflow.ts`:
  ```ts
  useWorkflow(restaurantId: number): {
    nextStatus: (current: string) => string | null;
    isTerminal: (status: string) => boolean;
    statuses: string[];
    loading: boolean;
  }
  ```
  - Fetches on mount; caches in a module-level `Map<restaurantId, { data, fetchedAt }>`
    with 60 s TTL (no external library needed)
  - Falls back to hardcoded defaults on error (logs warning, never crashes UI)
  - Emits a cache-invalidation when a `workflow_changed` SSE event is received
    (new `'workflow'` channel added to `RefreshChannel` + `eventToChannels`)

- [x] **5.3** All sections in `staff.tsx` use `useWorkflow`:
  - `KitchenSection` — COLS derived from workflow statuses; advance calls `nextStatus`
  - `DeliverySection` — uses `getDeliveryOrders`; `deliveryActionStatus` derived from workflow
  - `SessionsSection` — uses `getCashierOrders` (Part 4 endpoint); adapted data shape
  - `OrdersSection` — advance uses `nextStatus`; uses `getOrdersOverview`; ACTIVE_STATUSES
    derived from non-terminal workflow statuses

---

### Part 6 — Hook & API Hardening (Mobile) ✅ COMPLETE
**Goal:** No concurrent fetches. In-flight requests cancelled on unmount. Errors
surfaced to the user. Permissions not re-fetched on every screen focus.

> Part 6 does not require any file-splitting. `staff.tsx` stays as one file.
> Sections are shown purely by permissions — that architecture is complete.

- [x] **6.1** `useRealtimeOrders` — added `isFetchingRef = useRef(false)` guard.
  If a fetch is already in flight, skip the new one entirely (SSE bursts, fast
  tab switches). Reset to `false` in the `finally` block.

- [x] **6.2** `useRealtimeOrders` — added `AbortController` support. New controller
  per fetch; previous controller aborted on next fetch start and on unmount.
  `AbortError` caught separately (not an error state). Signal threaded through
  `fetchFn(signal)` → `orderAPI.getKitchenOrders/getDeliveryOrders/getOrdersOverview`
  → `BaseAPI.get({ signal })` → `fetch(url, config)`. `BaseAPI` catch block
  suppresses `AbortError` logging.

- [x] **6.3** `useRealtimeOrders` — added `error: Error | null` to the returned
  object. Set on fetch failure; cleared on next successful fetch. All three
  sections in `staff.tsx` destructure `error` ready for Part 7 ErrorBanner.

- [x] **6.4** `usePermissions` — 30 s module-level cache (`permissionsCache`) keyed
  by `restaurantId`. `useFocusEffect` reads from cache if fresh, re-fetches if
  stale. `refreshEmitter.subscribe('permissions')` busts the cache entry and
  re-fetches immediately on `permission_changed` SSE events.
  - Added `'permissions'` to `RefreshChannel` in `lib/realtime.ts`.
  - Added `permission_changed` → `['permissions']` to `eventToChannels`.

---

### Part 7 — Error UX (Mobile) ✅ COMPLETE
**Goal:** Users see actionable errors. No silent failures. No raw API error strings.

- [x] **7.1** Created `components/ui/ErrorBanner.tsx` — dismissible inline banner.
  Props: `message: string`, `onRetry?: () => void`, `onDismiss: () => void`.
  Rendered below section header, above content. Never a modal.

- [x] **7.2** `StaffDashboard` — 10 s timer on `sseConnected === false` fires
  `sseDisconnected` state. `ErrorBanner` shows "Live updates paused — retrying…".
  Auto-dismissed (state reset) the moment `sseConnected` becomes `true`.

- [x] **7.3** `KitchenSection`, `DeliverySection`, `OrdersSection` — `ErrorBanner`
  when `error !== null` (from `useRealtimeOrders`). Retry calls `refresh()`;
  Dismiss calls `clearError()` (new return value added to `useRealtimeOrders`).

- [x] **7.4** All non-destructive action handlers replaced — `KitchenSection`
  (accept, advance, resend), `DeliverySection` (accept, deliver, undo),
  `OrdersSection` (advance, resend), `TablesSection` (unblock) — now set a
  `actionError` local state with 3 s auto-clear instead of `Alert.alert`.
  `Alert.alert` reserved for destructive confirmations only: void order,
  force-release table, close session, accept-required guards.

- [x] **7.5** `BaseAPI.request()` + `BaseAPI.upload()` — intercept HTTP 403 and
  throw `PermissionError extends Error` (exported from `lib/api/base.ts`,
  re-exported from `lib/api/index.ts`). All action handlers catch
  `instanceof PermissionError` and show the shared `PERM_ERR` constant:
  "You don't have permission for this action. Contact your manager."

---

## Permission Correctness Table (Definition of Done)

Enforced at three layers: route middleware (Parts 1+4), service layer (Parts 2+3),
and mobile UI section visibility (Part 5).

| Permission           | Endpoint accessible          | UI section shown   | Actions available              |
|----------------------|------------------------------|--------------------|--------------------------------|
| `order_prepare`      | `/orders/kitchen`            | Kitchen kanban     | Accept, Advance, Resend*       |
| `order_deliver`      | `/orders/delivery`           | Delivery list      | Accept, Advance→served, Resend* |
| `close_sessions`     | `/orders/cashier` + sessions | Cashier/Sessions   | Close session                  |
| `view_orders`        | `/orders/overview`           | Orders overview    | Read only                      |
| `update_orders`      | `/orders/overview`           | Orders overview    | Accept, Advance, Resend*       |
| `modify_order`       | (+ one read perm)            | Same as read perm  | Void items/order               |
| `resend_notification`| (+ one read perm)            | Resend button      | Resend push notification       |
| `helper_block_table` | `/tables` (read)             | Tables             | Block/Unblock table            |
| `table_force_release`| `/tables` (read)             | Tables             | Force release occupied table   |

*Resend button visible only when `resend_notification` is also present.

**Rule:** A user must NEVER see a 403 error for an action they were never shown a button for.

---

## Implementation Order

```
Part 1  (permission util)                 ✅ complete
Part 2  (service decomposition)           ✅ complete
Part 3  (notification rewrite)            ✅ complete
Part 4  (route cleanup)                   ✅ complete
Part 5  (useWorkflow hook)                ✅ complete
Part 6  (hook hardening)                  ✅ complete
Part 7  (error UX)                        ✅ complete
Part 8  (RBAC test suite)                 ✅ complete
Part 9  (notification orchestrator tests) ✅ complete
```

---

## Part 8 — RBAC Test Suite

**Goal:** Deliver the deferred tests from steps 1.6 and 4.6.
All three files live in `apps/backend/tests/`.

### Test Infrastructure

- **`jest.config.cjs`** — added `isolatedModules: true` to `apps/backend/tsconfig.json`
  so ts-jest uses `transpileModule` mode and avoids the `verbatimModuleSyntax` /
  CommonJS conflict (bundler-mode project tsconfig vs. Jest's CJS runtime).

### Test Files

- [x] **8.1** `tests/resolve-permissions.test.ts` — **8 unit tests**
  Pure function; DB fully mocked via `jest.mock('@menugo/data')` +
  `jest.mock('@menugo/data/schemas')` + `jest.mock('drizzle-orm')`.
  Chainable Drizzle query mock resolves to seeded row arrays.
  Covers: unknown user (fully-denied fallback), super-admin short-circuit (no
  Query 2), `memberIsOwner` flag, role named `"owner"` (backward compat),
  non-member (no record + no roles), empty-permission role, multi-role union
  merge, and false-value exclusion.
  **Fix applied:** `jest.resetAllMocks()` in `beforeEach` (not `clearAllMocks`)
  so unconsumed `mockReturnValueOnce` values from the super-admin test
  (which short-circuits before Query 2) don't bleed into subsequent tests.

- [x] **8.2** `tests/permission-middleware.test.ts` — **12 unit tests**
  `resolvePermissions` mocked. Minimal `req` / `res` / `next` stubs.
  Covers: no `req.user` → 401, NaN `restaurantId` → 400,
  super-admin bypass, owner bypass, non-member → 403,
  member with all required perms → passes, member missing one → 403,
  `requireAnyPermission` with ≥1 match → passes, with none → 403,
  `requireMembership` member → passes, non-member → 403,
  super-admin passes `requireMembership` without a membership record,
  cache: `req.resolvedPermissions` pre-populated → `resolvePermissions` never called.

- [x] **8.3** `tests/order-permission-matrix.test.ts` — **59 integration tests**
  Real Express app with real order router. Mocked:
    • `validate` middleware → pass-through (tests permission logic, not Zod schemas)
    • `subscriptionService.getSubscriptionStatus` → professional/active
    • `resolvePermissions` → per-userId permission map
    • All `orderController` methods → `res.json({ ok: true })`
  8 named test users (owner, kitchen, deliver, cashier, viewer, modifier, notifier,
  no-perm). Every endpoint tested for: owner 200, correct-perm 200, wrong-perm 403,
  unauthenticated 401, non-member 403 (cross-cutting).

**Total: 79 tests, 0 failures.**

---

## Part 9 — Notification Orchestrator Test Suite

**Goal:** Deliver the deferred integration tests from step 3.8.
File lives in `apps/backend/tests/notification-orchestrator.test.ts`.

### What is tested

Every routing branch of `NotificationOrchestrator.dispatch()`, verified by
observing which repositories were queried and what `routingStrategy` label
was written to `notification_log`.  All external dependencies are mocked:
repositories, `eventBus`, `sendExpoPush`, Firebase `getMessaging` (returns
null → FCM path skipped), and `logger`.

### Test groups (32 cases)

- [x] **SSE emission (5 cases)** — `order_placed`, `order_status_changed`,
  `order_accepted`, `order_cancelled` each map to the correct SSE event name.
  SSE fires even when demo mode suppresses push.

- [x] **Demo mode (2 cases)** — `isDemoMode: true` → no device-token queries,
  no `notification_log` entry created.

- [x] **self_service + customer-notify step (6 cases)** — routes to
  `sendToCustomerDevice`; log entry has `routingStrategy: "self_service_customer"`;
  no staff tokens queried; skipped when order has no `createdByDeviceId`;
  skipped when no customer tokens for that device;
  falls through to `sendByRoleSettings` when the transition is NOT a
  customer-notify step.

- [x] **full_service + customer-notify step — waiters available (3 cases)** —
  routes to `sendToAvailableWaiters`; log has
  `routingStrategy: "full_service_available_waiters"`;
  `findClockedIn` is never called (no fallback needed).

- [x] **full_service + customer-notify step — no waiters, fallback (3 cases)** —
  falls back to `sendToAllClockedIn`; log has
  `routingStrategy: "full_service_available_waiters_fallback"`;
  no log created if the fallback pool has no tokens.

- [x] **fast_service + order_placed (4 cases)** — broadcasts to all clocked-in;
  log has `routingStrategy: "fast_service_broadcast"`;
  non-order_placed events fall through to `sendByRoleSettings`;
  no log when clocked-in have no tokens.

- [x] **sendByRoleSettings — default (5 cases)** — queries
  `notificationSettingsRepository.findRecipientsForEvent`; log has
  `routingStrategy: "role_settings"`; no log when no recipients or no tokens;
  Expo push called for native token recipients.

- [x] **Custom workflow — non-standard notify state (3 cases)** —
  `self_service` with `isCustomerNotifyStep` on `"served"` (not `"ready"`)
  still selects `self_service_customer`; non-notify transitions fall through
  correctly; `full_service` with custom state uses
  `full_service_available_waiters`.

- [x] **Log payload shape (1 case)** — `notification_log.create` called with
  correct `restaurantId`, `orderId`, `eventType`, and `recipientUserIds`.

**Total: 32 tests, 0 failures.**

### Test-suite totals across all parts

| File                                   | Tests | Result  |
|----------------------------------------|-------|---------|
| `resolve-permissions.test.ts`          |     8 | ✅ pass |
| `permission-middleware.test.ts`        |    12 | ✅ pass |
| `order-permission-matrix.test.ts`      |    59 | ✅ pass |
| `notification-orchestrator.test.ts`    |    32 | ✅ pass |
| **Total**                              |  **111** | ✅ **all pass** |
