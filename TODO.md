# MenuGo — Implementation TODO

> Generated: 2026-02-24
> Scope: Roles & Permissions hardening, Notification workflows, Audit system, Real-time infrastructure, and remaining features.

---

## Current State Summary

### ✅ Already Implemented
- **Role CRUD** — Create, update, delete roles per restaurant (schema, repo, service, controller, routes)
- **Permission middleware** — `requirePermission()` checks user's merged role permissions; owner bypasses all
- **User-Role assignment** — `user_roles` table, assignment during invitation acceptance
- **Permission-gated routes** — All admin routes use `requirePermission(PERMISSION_KEY)`
- **Member & Invitation system** — Invite by email, accept token, assign roles on join
- **FCM push notifications** — Device token registration, notification settings matrix (event × role), `triggerOrderNotification()` pipeline, default seeding
- **Order status transitions** — Hardcoded valid transitions in `order.service.ts`
- **Session/group system** — Create, join, close sessions with capacity checks
- **Menu, Tables, File uploads, Subscriptions, Auth** — All fully working

### ⚠️ Partially Implemented
- **Subscription plan enforcement** — `requirePlan()` middleware exists but is NOT mounted on any route
- **Validation middleware** — Placeholder with TODO; no Zod/Joi validation
- **Notification workflows** — Basic FCM send exists but lacks the 3 distinct workflow modes (Full-Service, Fast-Service, Self-Service)

### ❌ Not Implemented At All
- WebSocket / Real-time events
- Audit log system
- Dynamic workflow engine (configurable per-restaurant order flows)
- Staff clock-in / availability tracking
- Helper soft-block system
- Inventory / stock management (86ing)
- Order modification & voiding
- Manual notification re-send
- Table force release with audit
- Bill splitting & discounts
- Training / demo mode
- Super-admin platform management

---

## Implementation Phases

---

### Phase 1: Permission System Hardening

> Goal: Ensure the existing permission system is robust, consistent, and complete before building on top of it.

#### 1.1 — Define canonical permission constants
- [ ] **File:** `packages/dto/src/constants/permissions.ts`
- [ ] Audit the current `PERMISSIONS` object — ensure all 4 modules from `Changes.md` are covered
- [ ] Add any missing permission keys:
  - `MANAGE_STOCK` (inventory toggle / 86ing)
  - `TABLE_FORCE_RELEASE`
  - `HELPER_BLOCK_TABLE`
  - `MODIFY_ORDER` (void/edit after creation)
  - `RESEND_NOTIFICATION`
  - `VIEW_AUDIT_LOG`
  - `MANAGE_WORKFLOWS`
- [ ] Group permissions by domain in the DTO for frontend rendering (e.g., Orders, Tables, Menu, Staff, System)
- [ ] Add TS type for the permission matrix shape so role.permissions is strongly typed

#### 1.2 — Default role templates
- [ ] **File:** `packages/dto/src/constants/permissions.ts` or new `role-templates.ts`
- [ ] Define default permission sets for each standard role as specified in `Changes.md`:
  - **Kitchen** — `VIEW_ORDERS`, `ORDER_PREPARE`, `MANAGE_STOCK` (if granted)
  - **Waiter** — `VIEW_ORDERS`, `ORDER_DELIVER`, `TABLE_FORCE_RELEASE` (if granted)
  - **Cashier** — `CLOSE_BILL`, `VIEW_ORDERS`
  - **Helper** — `MANAGE_TABLES`, `HELPER_BLOCK_TABLE`
  - **Manager** — All except `MANAGE_ROLES` (configurable)
  - **Owner** — All permissions (hardcoded bypass, no template needed)
- [ ] Update the restaurant creation seed logic in `restaurant.service.ts` to use these templates

#### 1.3 — Permission matrix admin API
- [ ] **Endpoint:** `PUT /api/restaurants/:id/roles/:roleId/permissions`
- [ ] Accept a full permissions object (toggle on/off individual permissions)
- [ ] Validate that `Owner` role permissions cannot be modified
- [ ] Validate that the actor has `MANAGE_ROLES` permission
- [ ] Return the updated role with its new permissions
- [ ] **Frontend:** Admin permission matrix toggle UI (grid of roles × permissions with checkboxes)

#### 1.4 — Mount `requirePlan()` middleware
- [ ] **File:** `apps/backend/src/routes/` (all relevant route files)
- [ ] Identify features gated by subscription tier from `subscription-plans.ts` config
- [ ] Mount `requirePlan('professional')` or `requirePlan('enterprise')` on appropriate routes
- [ ] Test that free-tier restaurants are blocked from premium features

#### 1.5 — Input validation with Zod
- [ ] **File:** `apps/backend/src/middlewares/validate.middleware.ts`
- [ ] Install Zod (or use existing if in deps)
- [ ] Replace the no-op `validateRequest()` with real Zod schema validation
- [ ] Create Zod schemas for all existing endpoints (body, params, query)
- [ ] Apply `validateRequest(schema)` to all routes

---

### Phase 2: Audit Log System

> Goal: Implement the audit log infrastructure as defined in `rules.md` §5 — required before building overrides, force actions, and workflow changes.

#### 2.1 — Audit log schema
- [ ] **File:** `apps/backend/schema.ts` (or `packages/data/src/schemas/`)
- [ ] Create `audit_logs` table:
  ```
  id, restaurant_id, actor_user_id, action_type, entity_type, entity_id,
  old_value (jsonb), new_value (jsonb), reason (text, nullable),
  ip_address, created_at
  ```
- [ ] Create `action_type` enum: `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_DELETED`, `PERMISSION_CHANGED`, `MEMBER_INVITED`, `MEMBER_REMOVED`, `ORDER_STATUS_CHANGED`, `ORDER_VOIDED`, `SESSION_FORCE_CLOSED`, `TABLE_FORCE_RELEASED`, `MENU_AVAILABILITY_CHANGED`, `STOCK_UPDATED`, `WORKFLOW_CHANGED`, `OVERRIDE`
- [ ] Run migration

#### 2.2 — Audit log repository & service
- [ ] **File:** `apps/backend/src/repositories/audit.repository.ts`
- [ ] `createAuditLog(entry)` — insert
- [ ] `getAuditLogs(restaurantId, filters)` — paginated query with filters by entity_type, action_type, actor, date range
- [ ] **File:** `apps/backend/src/services/audit.service.ts`
- [ ] `log(restaurantId, actorId, action, entityType, entityId, oldValue, newValue, reason?)` — convenience wrapper
- [ ] Consider a middleware/decorator pattern to auto-audit certain actions

#### 2.3 — Audit log API
- [ ] **File:** `apps/backend/src/controllers/audit.controller.ts`
- [ ] `GET /api/restaurants/:id/audit-logs` — paginated, filterable, guarded by `VIEW_AUDIT_LOG`
- [ ] **File:** `apps/backend/src/routes/audit.routes.ts`
- [ ] Register routes

#### 2.4 — Integrate audit logging into existing actions
- [ ] Role create / update / delete → audit log
- [ ] Permission change → audit log (old vs new permissions diff)
- [ ] Member invite / remove → audit log
- [ ] Order status transitions → audit log
- [ ] Menu item availability toggle → audit log
- [ ] Session close → audit log
- [ ] Any future force/override action → audit log with mandatory `reason`

---


### Phase 3: Real-Time Infrastructure (FCM Push & SSE)

> Goal: Use FCM push notifications for all critical events and Server-Sent Events (SSE) for live dashboard updates. No WebSocket dependency.

#### 3.1 — FCM push for all real-time events
- [ ] Ensure all critical events (order placed, order ready, delivery, table status, etc.) trigger FCM push notifications to relevant devices/roles
- [ ] Use FCM as the "ping" to wake up the app and trigger UI refresh
- [ ] Extend notification service to support all event types needed for staff and customer flows

#### 3.2 — SSE endpoint for live dashboards
- [ ] **File:** `apps/backend/src/routes/sse.routes.ts`
- [ ] Implement `/api/restaurants/:id/events/stream` SSE endpoint for staff dashboards (kitchen, waiter, helper, cashier)
- [ ] Stream events as `res.write()` in text/event-stream format
- [ ] Use Redis pub/sub or in-memory event bus for multi-instance scaling

#### 3.3 — Mobile/Web client integration
- [ ] On FCM push, invalidate relevant React Query caches to fetch latest data
- [ ] For always-on screens (kitchen display, table grid), use SSE client (or polling as fallback)
- [ ] Use `react-native-sse` or similar for mobile SSE support
- [ ] Remove all WebSocket dependencies from mobile/web

#### 3.4 — REST polling fallback
- [ ] For non-critical or low-frequency updates, use React Query polling (e.g., every 5s)
- [ ] Ensure polling is only active when screen is focused

#### 3.5 — Documentation
- [ ] Document FCM + SSE architecture for future devs
- [ ] Add usage examples for both FCM and SSE endpoints

---

### Phase 4: Notification Workflow Engine

> Goal: Implement the three notification workflows from `Changes.md` Module 2 with smart filtering.

#### 4.1 — Staff availability tracking (Clock-In system)
- [ ] **Schema:** Add `staff_availability` table:
  ```
  id, user_id, restaurant_id, status (clocked_in | clocked_out),
  active_order_count (integer, default 0), clocked_in_at, clocked_out_at
  ```
- [ ] **Repository:** `availability.repository.ts` — clockIn, clockOut, getAvailableStaff, incrementActiveOrders, decrementActiveOrders
- [ ] **Service:** `availability.service.ts` — clock in/out logic, auto clock-out at end of day
- [ ] **API:** `POST /api/restaurants/:id/staff/clock-in`, `POST /api/restaurants/:id/staff/clock-out`, `GET /api/restaurants/:id/staff/availability`
- [ ] Update active order count when waiter accepts/completes a delivery

#### 4.2 — Restaurant workflow mode configuration
- [ ] **Schema:** Add `workflow_mode` field to `restaurants` table (or in `workflow_settings` JSONB):
  - `full_service` — Kitchen prepares → filtered waiter notification → waiter delivers
  - `fast_service` — Broadcast to all waiters immediately
  - `self_service` — Kitchen prepares → customer notified directly
- [ ] **API:** `PUT /api/restaurants/:id/settings/workflow-mode`
- [ ] **Validation:** Only owner/manager can change workflow mode

#### 4.3 — Full-Service workflow (Kitchen + Waiter)
- [ ] When order placed → notify Kitchen role
- [ ] When kitchen marks "Order Ready":
  1. Query all waiters who are `clocked_in` AND `active_order_count == 0`
  2. Send push notification ONLY to those filtered waiters
  3. First waiter to tap "Accept" claims the order (atomic DB lock — `UPDATE ... WHERE claimed_by IS NULL`)
  4. Losers get "Order already claimed" response
- [ ] Waiter flow: Accept → Pickup → Deliver → Mark Delivered
- [ ] On delivery complete: decrement waiter's active_order_count

#### 4.4 — Fast-Service workflow (Waiter Broadcast)
- [ ] When order placed → broadcast notification to ALL clocked-in waiters (no filtering)
- [ ] First waiter to accept claims it (same atomic lock)
- [ ] Waiter gets food and delivers

#### 4.5 — Self-Service workflow (Kitchen + Customer)
- [ ] When order placed → notify Kitchen role
- [ ] When kitchen marks "Order Ready" → send notification to the customer's device
- [ ] Requires: customer device token registration (extend `device_tokens` table to support device-based tokens, not just user-based)
- [ ] Customer walks to pickup counter

#### 4.6 — Waiter order acceptance (concurrency-safe)
- [ ] **Schema:** Add `claimed_by` (user_id) and `claimed_at` (timestamp) to `orders` table
- [ ] **Endpoint:** `POST /api/restaurants/:id/orders/:orderId/claim`
- [ ] Use `UPDATE orders SET claimed_by = ? WHERE id = ? AND claimed_by IS NULL` for atomic claim
- [ ] Return 409 Conflict if already claimed
- [ ] Emit `ORDER_CLAIMED` WebSocket event to all waiters

#### 4.7 — Manual notification re-send
- [ ] **Endpoint:** `POST /api/restaurants/:id/orders/:orderId/resend-notification`
- [ ] Guard with `RESEND_NOTIFICATION` permission
- [ ] Re-trigger the appropriate notification based on current order status
- [ ] Audit log the re-send

#### 4.8 — Notification history
- [ ] **Schema:** Add `notification_logs` table:
  ```
  id, restaurant_id, order_id (nullable), event_type, recipient_role_id,
  recipient_user_ids (jsonb), fcm_success_count, fcm_failure_count,
  payload (jsonb), sent_at
  ```
- [ ] Log every notification dispatch in `triggerOrderNotification()`
- [ ] **API:** `GET /api/restaurants/:id/notifications/history` (for debugging/admin)

---

### Phase 5: Helper & Table Management

> Goal: Implement the Helper soft-block system and table force-release from `Changes.md` Module 3.

#### 5.1 — Table status model enhancement
- [ ] Currently tables only have `is_active` boolean — status is derived from active sessions
- [ ] **Schema:** Add `helper_blocked_by` (user_id, nullable) and `helper_blocked_at` (timestamp, nullable) to `restaurant_tables`
- [ ] When `helper_blocked_by` is set and no active session exists → table shows as "Blocked" to other helpers
- [ ] When a customer scans QR on a blocked table → auto-clear the block, create session normally

#### 5.2 — Helper soft-block endpoints
- [ ] `POST /api/restaurants/:id/tables/:tableId/block` — Guard with `HELPER_BLOCK_TABLE`
- [ ] `POST /api/restaurants/:id/tables/:tableId/unblock` — Guard with `HELPER_BLOCK_TABLE`
- [ ] `GET /api/restaurants/:id/tables` — Include block status in table list response
- [ ] Emit `TABLE_STATUS_CHANGED` event via SSE and FCM push on block/unblock so other helpers see instantly

#### 5.3 — Table force release
- [ ] `POST /api/restaurants/:id/tables/:tableId/force-release` — Guard with `TABLE_FORCE_RELEASE`
- [ ] Requires `reason` in request body (mandatory per `rules.md` §5)
- [ ] Force-close all active sessions on the table
- [ ] Force-close all active group sessions within those sessions
- [ ] Cancel any pending/in-progress orders (or mark as force-closed)
- [ ] Audit log with reason
- [ ] Emit `TABLE_CLOSED` + `GROUP_CLOSED` events via SSE and FCM push

---

### Phase 6: Dynamic Workflow Engine

> Goal: Replace hardcoded order status transitions with configurable per-restaurant workflows as specified in `plan.md` Phase 5.

#### 6.1 — Workflow schema
- [ ] **Schema:** Add `restaurant_workflows` table:
  ```
  id, restaurant_id, from_state (order_status enum), to_state (order_status enum),
  required_permission, display_order, is_active, created_at
  ```
- [ ] Unique constraint on (restaurant_id, from_state, to_state)

#### 6.2 — Workflow service
- [ ] **File:** `apps/backend/src/services/workflow.service.ts`
- [ ] `getWorkflows(restaurantId)` — fetch all active transitions
- [ ] `validateTransition(restaurantId, fromState, toState, userPermissions)` — check if transition is allowed and user has required permission
- [ ] `seedDefaultWorkflows(restaurantId)` — create standard transitions on restaurant creation:
  ```
  received → preparing (ORDER_PREPARE)
  preparing → ready (ORDER_PREPARE)
  ready → served (ORDER_DELIVER)
  served → paid (CLOSE_BILL)
  any → cancelled (MODIFY_ORDER)
  ```

#### 6.3 — Integrate into order service
- [ ] Replace the hardcoded `validTransitions` map in `order.service.ts` with `workflow.validateTransition()`
- [ ] Order status change endpoint checks the workflow + required permission dynamically

#### 6.4 — Workflow admin API
- [ ] `GET /api/restaurants/:id/workflows` — list transitions
- [ ] `PUT /api/restaurants/:id/workflows` — update transitions (bulk)
- [ ] Guard with `MANAGE_WORKFLOWS` permission
- [ ] Validate no orphan states (every non-terminal state must have at least one outgoing transition)

---

### Phase 7: Inventory & Stock Management

> Goal: Implement stock tracking and 86ing from `Changes.md` Module 4 and `plan.md` Phase 8.

#### 7.1 — Stock schema
- [ ] Add columns to `menu_items`:
  - `stock_count` (integer, nullable — null means unlimited)
  - `is_sold_out` (boolean, default false)
- [ ] Add columns to `menu_item_variants`:
  - `stock_count` (integer, nullable)
  - `is_sold_out` (boolean, default false)

#### 7.2 — Stock service
- [ ] **File:** `apps/backend/src/services/stock.service.ts`
- [ ] `toggleSoldOut(itemId, isSoldOut)` — instant sold-out toggle, audit log
- [ ] `setStockCount(itemId, count)` — set available quantity (86ing)
- [ ] `decrementStock(itemId, quantity)` — called on order placement, atomic decrement
- [ ] Auto-mark `is_sold_out = true` when `stock_count` reaches 0
- [ ] Auto-hide sold-out items from public menu API

#### 7.3 — Stock API
- [ ] `PUT /api/restaurants/:id/menu/items/:itemId/stock` — Guard with `MANAGE_STOCK`
- [ ] `PUT /api/restaurants/:id/menu/items/:itemId/sold-out` — Guard with `MANAGE_STOCK`
- [ ] Emit stock change event via SSE and FCM push (for live menu updates)
- [ ] Audit log stock changes

#### 7.4 — Order placement stock validation
- [ ] On order placement: check stock availability for every item
- [ ] If stock insufficient → reject with `ITEM_NOT_AVAILABLE` error
- [ ] Decrement stock atomically within the order transaction
- [ ] If stock hits 0 → auto-trigger sold-out, emit event

---

### Phase 8: Order Modifications & Billing

> Goal: Implement order voiding and cashier billing features.

#### 8.1 — Order voiding / cancellation
- [ ] `POST /api/restaurants/:id/orders/:orderId/void` — Guard with `MODIFY_ORDER`
- [ ] Requires `reason` in request body
- [ ] Can only void orders in `received` or `preparing` status
- [ ] Restore stock counts on void
- [ ] Audit log with reason
- [ ] Emit `ORDER_STATUS_CHANGED` event
- [ ] Notify kitchen if order was in `preparing` state

#### 8.2 — Order item modification
- [ ] `PUT /api/restaurants/:id/orders/:orderId/items/:itemId` — Guard with `MODIFY_ORDER`
- [ ] Allow quantity change or item removal before `ready` status
- [ ] Recalculate order total
- [ ] Audit log the modification

#### 8.3 — Bill closing flow
- [ ] Ensure `CLOSE_BILL` permission is enforced on session close
- [ ] When cashier closes bill:
  1. Verify all orders in session are in `served` or `cancelled` state
  2. Calculate final total
  3. Mark session as `closed`
  4. Mark all group sessions as `CLOSED`
  5. Invalidate session tokens
  6. Free up table capacity
  7. Audit log

#### 8.4 — Bill splitting (Future / Low Priority)
- [ ] Design bill splitting model (by person, by item, equal split)
- [ ] Track individual payment status per split
- [ ] This is cosmetic — system doesn't handle actual payments

#### 8.5 — Discount application (Future / Low Priority)
- [ ] `discounts` table: id, restaurant_id, name, type (percentage/flat), value, is_active
- [ ] Apply discount to order or session total
- [ ] Guard with cashier/manager permission
- [ ] Audit log discount application

---

### Phase 9: Super Admin & Platform Management

> Goal: Build the platform-level super admin capabilities.

#### 9.1 — Super admin middleware
- [ ] Create proper `requireSuperAdmin()` middleware
- [ ] Super admin can access any restaurant's data (override tenant isolation)
- [ ] Super admin can view platform-wide analytics

#### 9.2 — Platform admin APIs
- [ ] `GET /api/admin/restaurants` — list all restaurants with stats
- [ ] `PUT /api/admin/restaurants/:id/suspend` — suspend a restaurant
- [ ] `PUT /api/admin/restaurants/:id/activate` — reactivate
- [ ] `GET /api/admin/users` — list all users platform-wide
- [ ] `PUT /api/admin/users/:id/ban` — ban user (already partially exists)

---

### Phase 10: Mobile App Integration

> Goal: Wire up frontend screens for the new backend features.

#### 10.1 — Permission matrix screen (Admin)
- [ ] Grid UI: roles as columns, permissions as rows
- [ ] Toggle switches for each permission
- [ ] Save updates via `PUT /roles/:id/permissions`
- [ ] Owner role shown as read-only (all enabled)

#### 10.2 — Kitchen display
- [ ] Real-time order feed via WebSocket
- [ ] Large cards with item names, quantities, table number
- [ ] "Accept" → "Preparing" → "Ready" one-tap buttons
- [ ] Color-coded status (green/yellow/red)
- [ ] Sound notification on new order

#### 10.3 — Waiter view
- [ ] Notification popup for "Order Ready" (or new order in fast-service)
- [ ] "Accept" button with conflict handling (show toast if already claimed)
- [ ] Active deliveries list with one-tap status updates
- [ ] Clock in / clock out toggle

#### 10.4 — Helper table view
- [ ] Table grid with color-coded status (Available / Occupied / Blocked)
- [ ] One-tap "Block" / "Unblock" buttons
- [ ] Real-time updates via WebSocket

#### 10.5 — Cashier view
- [ ] Session/table list with order totals
- [ ] "Close Bill" button with confirmation
- [ ] Discount application UI (when implemented)

#### 10.6 — Customer notification handling
- [ ] Register device token on session join (even without login)
- [ ] Listen for "Order Ready" push notification
- [ ] Show in-app notification banner

#### 10.7 — Audit log viewer (Admin)
- [ ] Filterable list of audit entries
- [ ] Filter by: action type, actor, entity, date range
- [ ] Detail view with old/new value diff

---

### Phase 11: Training Mode & UX Polish

> Goal: Implement demo mode and server-friendly UX as specified in `plan.md` Phase 10.

#### 11.1 — Training / demo mode
- [ ] **Config:** Add `is_demo_mode` flag to restaurant settings
- [ ] In demo mode: orders are fake, no real notifications sent, data resets daily
- [ ] Seed fake menu, fake tables, fake orders for practice
- [ ] Visual indicator "TRAINING MODE" banner in the app

#### 11.2 — Server simplicity UX (ongoing)
- [ ] Icon-first action buttons (no text labels on primary actions)
- [ ] Color-coded states everywhere: 🟢 Ready, 🟡 Preparing, 🔴 Pending
- [ ] One-action-per-screen pattern for staff roles
- [ ] Large tap targets (minimum 48×48dp)
- [ ] Haptic feedback on critical actions
- [ ] Confirmation dialogs on destructive actions only
- [ ] Undo support where possible (e.g., undo status change within 5 seconds)

---


| Priority | Phase | Reason |
|----------|-------|--------|
| 🔴 P0 | Phase 1 — Permission hardening | Foundation for everything else |
| 🔴 P0 | Phase 2 — Audit logs | Required by rules.md before any force/override action |
| 🔴 P0 | Phase 3 — FCM Push & SSE | Real-time is core to all notification workflows, but no WebSocket overhead |
| 🟠 P1 | Phase 4 — Notification workflows | Core product differentiator (3 service modes) |
| 🟠 P1 | Phase 5 — Helper & table management | Unique table flow features |
| 🟡 P2 | Phase 6 — Workflow engine | Replaces hardcoded transitions with flexible config |
| 🟡 P2 | Phase 7 — Inventory & stock | Important for operations but not blocking |
| 🟡 P2 | Phase 8 — Order mods & billing | Completes the order lifecycle |
| 🟢 P3 | Phase 9 — Super admin | Platform management, not user-facing |
| 🟢 P3 | Phase 10 — Mobile integration | Parallel work as backend phases land |
| 🟢 P3 | Phase 11 — Training & UX | Polish layer |

---

## Dependencies Graph

```

Phase 1 (Permissions) ──┬──→ Phase 2 (Audit) ──→ Phase 5 (Helper/Tables)
                        │                    ──→ Phase 8 (Order Mods)
                        │
                        ├──→ Phase 3 (FCM Push & SSE) ──→ Phase 4 (Notifications)
                        │                              ──→ Phase 5 (Helper/Tables)
                        │                              ──→ Phase 7 (Stock)
                        │
                        ├──→ Phase 6 (Workflows) ──→ Phase 4 (Notifications)
                        │
                        └──→ Phase 10 (Mobile) ← depends on all backend phases
```

---

## Notes

- **Concurrency safety** is critical for waiter order claiming (Phase 4.6) and stock decrement (Phase 7.4) — use DB-level atomic operations, not application-level locks.
- **Every force/override action** must require a `reason` field and create an audit log entry — no exceptions.
- **WebSocket rooms** should mirror the permission model — staff only see events for their restaurant; customers only see events for their session.
- **Customer device tokens** (Phase 4.5) need special handling since customers don't have user accounts — tokens are tied to device ID + session.
- **All new tables must include `restaurant_id`** per the multi-tenant isolation rules in `rules.md` §6.
