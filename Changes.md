Module 1: User Roles & Access Control
The Admin has a "Permission Matrix." They can toggle these specific capabilities for any role, but the default setup is as follows:
Customer: The end-user. Can scan QR codes, browse the menu, place orders, and track progress.
Kitchen: The production team. Can see incoming orders, update the status of individual food items (e.g., "Cooking," "Ready"), and mark the whole order as "Order Ready."
Waiter: The service team. Can accept delivery tasks, mark items as picked up/delivered, and "Unlock" tables if they are mistakenly stuck in a locked state.
Cashier: The financial team. Can split bills, apply discounts, and perform the final "Close Bill" action to free up a table.
Helper: The floor manager. Can see table capacities and "Soft-Block" tables to manage the crowd flow.
Admin: The super-user. Can re-assign permissions, override any system state, and view the history (Audit Log) of who did what.
Module 2: The Three Notification Workflows
Case 1: Full-Service (Kitchen + Waiter)
Step 1: Customer places an order.
Step 2: Kitchen Accepts 
 Prepares food 
 Marks "Order Ready."
Step 3 (The Filter): The system checks for all Waiters who are Clocked In AND have Zero active orders.
Step 4: A notification is sent only to those specific Waiters. The first one to click "Accept" claims the order.
Step 5: Waiter (Pickup 
 Deliver 
 Mark Delivered).
Step 6: Cashier closes the bill.
Case 2: Fast-Service (Waiter Broadcast)
Step 1: Customer places an order.
Step 2 (The Broadcast): Every Clocked In Waiter receives a notification immediately, regardless of whether they are currently busy or not.
Step 3: A Waiter accepts, gets the food, and delivers it.
Step 4: Cashier closes the bill.
Case 3: Self-Service (Kitchen + Customer)
Step 1: Customer places an order.
Step 2: Kitchen Accepts 
 Marks "Order Ready."
Step 3 (Direct): A notification is sent only to the Customer’s phone.
Step 4: Customer walks to the kitchen to collect the food.
Step 5: Cashier closes the bill.
Module 3: Specialized Table & Crowd Logic
The "Helper" Soft-Block Rule
This is designed for high-traffic restaurants to prevent "Helper A" and "Helper B" from sending guests to the same empty table.
Helper Action: A Helper sees an empty table and clicks "Block."
System State: The table status becomes Helper_Blocked.
Visibility: This table now appears "Unavailable" to all other Helpers.
Customer Access: The block does not affect the Customer. If a Customer scans the QR code on that table, the system allows them to enter and automatically changes the status to Occupied.
Table Overrides
If a table is accidentally locked (e.g., a customer leaves without paying or a technical glitch occurs), a user with "Table Release" permissions can manually force the table back to Available.
Module 4: Inventory & Global Permissions
These permissions can be assigned to any user role (Kitchen, Waiter, or Cashier) depending on how the restaurant owner wants to run their business:
Inventory Toggle (Sold Out): Ability to instantly mark a dish as "Sold Out." Once toggled, the item disappears from the Customer's digital menu.
86ing (Count Management): Ability to set a specific quantity (e.g., "Only 10 burgers left"). The system counts down with every order and auto-hides the item at 0.
Order Modification: Ability to edit or "Void" (cancel) an order after the Kitchen has already started working on it (usually restricted to prevent theft/errors).
Manual Notification: Ability to re-send a "Food Ready" notification if the first one was missed.
Technical Implementation Note
To make this work seamlessly:
Concurrency: Use "Database Locking" so that if two Waiters click "Accept" at the exact same millisecond, only one wins and the other gets a message saying "Order already claimed."
Live Updates: Use WebSockets so that when a Helper blocks a table, the screen on the other Helpers' phones updates instantly without a refresh.
