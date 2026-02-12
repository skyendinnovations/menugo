1️⃣MASTER
Product & Architecture Foundation —
SPEC
This section defines the core rules of your system.
All backend, frontend, workflows, and AI-generated code MUST follow this.
1. Master Requirements (System-Level)
Core Product Goals
• Multi-restaurant SaaS platform
• Group-based seat locking per table (USP)
• Multiple groups per table
• Dynamic workflows based on restaurant roles
• Real-time operations for staff
• Offline billing (cashier handles payment externally)
• Low-literacy server UX
• Strong isolation between restaurants and groups
Non-Goals (Explicit)
• No online payments
• No seat-by-seat individual tracking
• No advanced accounting
• No consumer wallet or refunds
2. Domain Model (Authoritative)
Restaurant
Represents one tenant.
Fields (conceptual):
• id
• name
• status (ACTIVE, SUSPENDED)
• settings (workflow, language, etc.)User
Represents a platform user.
• id
• name
• phone/email
• global_role (SUPER_ADMIN only)
• status (ACTIVE, DISABLED)
RestaurantUser (User ↔ Restaurant)
Represents user inside a restaurant.
• user_id
• restaurant_id
• role_id
• status
Role
Defines a job function in a restaurant.
Examples:
• OWNER
• MANAGER
• CASHIER
• WAITER
• KITCHEN
Permission
Atomic system capability.
Examples:
• MANAGE_EMPLOYEES
• MANAGE_ROLES
• MANAGE_TABLES• MANAGE_MENU
• VIEW_ORDERS
• ORDER_PREPARE
• ORDER_DELIVER
• CLOSE_BILL
• FORCE_RELEASE_GROUP
Roles are mapped to permissions.
Table
Physical restaurant table.
• id
• restaurant_id
• name/number
• capacity
• status
TableSession
Represents a live usage of a table.
• id
• table_id
• restaurant_id
• status
• occupied_seats
• opened_at
• closed_at
One active TableSession per Table at a time.
GroupSession (Core USP)
Represents a group of people sharing seats.
• id• table_session_id
• restaurant_id
• group_name
• group_size
• status
• session_token
• created_at
• closed_at
• last_activity_at
This is what customers belong to.
Order
Represents one logical order.
• id
• restaurant_id
• table_session_id
• group_session_id
• status
• created_at
OrderItem
Line items in an order.
• order_id
• menu_item_id
• qty
• price_snapshot
Workflow
Defines allowed order transitions per restaurant.
• restaurant_id
• from_state• to_state
• required_permission
3. Enums (Authoritative)
OrderStatus
PLACED
PREPARING
PREPARED
DELIVERING
DELIVERED
CANCELLED
CLOSED
GroupStatus
ACTIVE
CLOSED
EXPIRED
FORCE_CLOSED
TableStatus
IDLE
ACTIVE
CLOSING
CLOSED
UserStatus
ACTIVE
DISABLED
RestaurantStatus
ACTIVE
SUSPENDED
4. Error Codes & API Error Standards
All APIs must return structured errors.Error Object Format
{
code: "ERROR_CODE",
message: "Human readable",
context: { optional_debug_info }
}
Core Error Codes
Seat & Group:
• SEATS_NOT_AVAILABLE
• GROUP_ALREADY_CLOSED
• GROUP_EXPIRED
• INVALID_GROUP_TOKEN
• GROUP_LIMIT_REACHED
Table:
• TABLE_NOT_ACTIVE
• TABLE_ALREADY_CLOSED
• TABLE_SESSION_NOT_FOUND
Orders:
• INVALID_ORDER_STATE
• ORDER_ALREADY_CLOSED
• DUPLICATE_ORDER
• ITEM_NOT_AVAILABLE
• VARIANT_NOT_AVAILABLE
Auth & Security:
• UNAUTHORIZED
• FORBIDDEN
• TENANT_MISMATCH
• INVALID_SESSION
Workflow:
• INVALID_TRANSITION
• PERMISSION_REQUIRED
System:
• CONCURRENCY_CONFLICT
• IDEMPOTENCY_VIOLATION5. Audit & Logging Standards
What MUST be audited
• Role changes
• Permission changes
• Group force close
• Table force close
• Order state transitions
• Menu item availability changes
• Manager overrides
Audit Log Fields
• id
• restaurant_id
• actor_user_id
• action_type
• entity_type
• entity_id
• old_value
• new_value
• reason
• created_at
Logging Rules
• All force actions require reason
• All workflow transitions logged
• All permission changes logged
6. Multi-Tenant Data Isolation Rules
These are non-negotiable.
Hard Rules
• Every core table MUST have restaurant_id
• Every API request MUST be scoped by restaurant_id• No query without restaurant_id filter
• SUPER_ADMIN is the only exception
• Never trust client-provided restaurant_id
• Restaurant context derived from auth + server lookup
Violations = Critical Bug
7. Session & Token Lifecycle Rules
Group Session Token
• Unique per GroupSession
• Used by customers
• Must expire on:
• Group close
• Group expiry
• Must be invalidated on force close
• Must be bound to group_session_id
Token Rules
• Token cannot be reused for another group
• Token must not access other groups
• Token validated on every customer API
8. Real-Time Event Contract (Authoritative)
These events must exist.
Events
GROUP_JOINED
{
table_session_id
group_session_id
group_name
group_size
}
GROUP_CLOSED
{table_session_id
group_session_id
reason
}
ORDER_PLACED
{
order_id
table_session_id
group_session_id
}
ORDER_STATUS_CHANGED
{
order_id
old_status
new_status
}
TABLE_CLOSED
{
table_session_id
}
9. Offline Billing Rules (Authoritative)
Core Principles
• System does NOT handle money
• Cashier collects payment externally
• System only tracks settlement state
Rules
• Each GroupSession has a logical bill
• Cashier/Manager closes GroupSession after payment
• Closed GroupSession:
• Cannot place new orders
• TableSession closes only when:
• All GroupSessions are CLOSED
• Force close allowed by Manager/Cashier
• Reopen GroupSession only by Manager (optional)10. Concurrency & Safety Principles
These are system-wide rules.
• Seat locking MUST be transactional
• Order placement MUST be idempotent
• Group join MUST be idempotent
• Group close MUST be idempotent
• Table close MUST be idempotent
• All critical updates use DB transactions
• Race conditions must fail safely
11. Server Simplicity UX (Architecture Rule)
This is a product rule, not just UI.
• Server actions must map to:
• One permission
• One button
• No text input for server
• All server actions must be reversible by Manager
• Server UI must be icon + color driven

12. Customer Access Rules (Public API)

Core Principles
• Customers do NOT require login/registration
• Access via QR code → session token
• Session token grants access to group and menu
• All customer actions scoped to their group session

Rules
• QR code contains session token
• Session token must be validated on every customer request
• Customers can only:
  • View menu for their restaurant
  • Place orders for their group
  • View orders for their group
  • View bill for their group
• Session token expires when group is closed
• No customer data persistence required

13. Menu Variant Rules

Core Principles
• Menu items can have multiple variants (size, type, etc.)
• Each variant has its own price
• Variants can be toggled available/unavailable independently
• Orders reference specific variants, not just items

Rules
• A menu item without variants must have a default variant
• Variant availability inherits from parent item availability
• If item is unavailable, all variants are unavailable
• Prices stored at variant level, not item level
• Orders must specify variant ID, not just item ID