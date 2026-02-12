⚙️ AI-Friendly Implementation Plan (Final — With Server Simplicity UX)
Tech Stack:
React Native (Web + Mobile) + Expo + Bun + Neon + Drizzle + Better Auth + Tailwind + shadcn
Phase 1 — Auth, Tenancy & Hierarchy
1. Users & Hierarchy
Roles:
SUPER_ADMIN
RESTAURANT_OWNER
MANAGER (Moderator)
STAFF (Cashier, Waiter, Kitchen, Server)
Permissions-based access.
Phase 2 — Role & Permission System
2. Permissions
Core permissions:
MANAGE_EMPLOYEES
MANAGE_ROLES
MANAGE_TABLES
MANAGE_MENU
MANAGE_STOCK
VIEW_ORDERS
ORDER_PREPARE
ORDER_DELIVER
CLOSE_BILL
FORCE_RELEASE_GROUP
Phase 3 — Tables & Group Sessions (USP)
3. Tables & Capacity
tables (capacity)
4. Group Sessionsgroup_sessions (group_name, group_size, status, token)
Seat locking via DB transaction.
Phase 4 — Orders (Group-Isolated)
5. Orders
orders (group_session_id, status)
order_items
Phase 5 — Dynamic Workflow Engine
6. Workflow
restaurant_workflows (from_state, to_state, required_permission)
Universal states:
PLACED → PREPARING → PREPARED → DELIVERING → DELIVERED → CLOSED
Phase 6 — Real-Time System
7. WebSockets Events
ORDER_PLACED
ORDER_READY
ORDER_DELIVER
GROUP_JOINED
GROUP_CLOSED
Phase 7 — Billing (Offline Close)
8. Close Flow
Cashier/Manager closes group/table
No online payments
Phase 8 — Menu & Stock
9. Stock
Atomic stock update
Out-of-stock blocking
Phase 9 — Manager (Moderator)
10. Manager Powers
Create employeesAssign roles
Manage tables/menu/stock
Force release groups
Phase 10 — Server Simplicity (CRITICAL UX REQUIREMENT)
11. Low-Literacy Server UX (NEW — CORE REQUIREMENT)
Requirements:
Server app must be usable by:
Low literacy users
Non-English speakers
First-time smartphone users
Must work in noisy, fast environment
UX Challenges:
Reading long text
Complex menus
Too many buttons
Confusing states
Implementation Plan:
a) Icon-First UI
Large icons instead of text
Color-coded actions:
🟢 Deliver
🔴 Pending
🟡 Ready
Minimal text
b) One-Action Screens
One main button per screen:
“Accept Order”“Food Ready”
“Delivered”
c) Table-Centric View
Big table cards
Group name + pax shown
Status color on table
d) Language & Symbols
Local language support (Tamil/English)
Emojis + symbols
Very large fonts
e) No Typing for Server
No text input
Only taps
Predefined buttons
f) Error-Proofing
Confirm dialogs for destructive actions
Undo where possible
Very clear success feedback
g) Training Mode
Demo mode for practice
Fake orders for training
Phase 11 — Audit & Overrides
12. Safety
Manager can override mistakes
Audit logs for all overrides
Key Product Principle (VERY IMPORTANT)
If a server needs training to use it, the UI has failed.Your server UI must be:
Obvious
Large
Visual
Foolproof