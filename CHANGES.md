# Changes Summary

## Multi-Currency Support
- **Backend**: Added `currency` text column (default 'INR') to `restaurants` table
- **Backend**: Generated and applied migration `0003_uneven_maggott.sql`
- **Backend**: Updated `getTableInfo` and `getMenu` public APIs to return `currency` in restaurant object
- **Mobile**: Created `currency.ts` utility with `formatPrice()`, `getCurrencySymbol()`, and 30+ supported currencies
- **Mobile**: Added currency Select picker to restaurant create and edit forms
- **Mobile**: Replaced all hardcoded currency symbols (₹, $) with dynamic `formatPrice()` in:
  - Customer menu page
  - Admin cashier page
  - Admin menu management page
  - Admin orders page

## Menu Item Variants Enhancement
- **Backend**: Base price auto-computed from lowest variant price when `hasVariants` is enabled
- **Mobile Item Form**: Hide base price field when "Has Variants" is toggled on
- **Mobile Customer Menu**: 
  - Display "From ₹XX" (lowest variant price) for items with variants
  - Tap to expand and view all variants
  - Show cart badge when variant items are in cart
- **Mobile Admin Menu**: Display "From ₹XX" with "Has variants" label for variant items

## Session Joining with Code
- **Backend**: Updated `getTableInfo()` to check both host and participants for `existingSessionId`
- **Backend**: Updated `createSession()` to detect if device is already a participant in active sessions
- **Mobile Seat Selection**: 
  - Added "Already at the table?" join section with 4-digit code input
  - Works on both normal screen and "Table Full" screen
  - Removed public display of customer names for privacy/security
  - Join requires only the code - backend resolves session automatically
- **Mobile Customer Menu**: Display session join code in header for easy sharing

## Customer Name Management
- **Mobile**: Added customer name persistence using SecureStore/localStorage
- **Mobile**: Auto-save customer name when creating a session
- **Mobile**: Customer name stored per device for future use

## UI/UX Improvements
- **Mobile Cashier**: Display customer name in orange text on session cards
- Simplified join flow text: "Enter the code shared by your friend or family member to access the menu"
- All buttons and forms now use consistent styling and disabled states
