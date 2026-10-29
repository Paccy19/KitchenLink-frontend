# KitchenLink API contract

**What this is:** every request the KitchenLink website makes to its backend.
Any backend that answers these requests the same way can run the website —
our own backend does, and a new one built from this document will too.

- 223 endpoints: 60 for the customer website, 45 for the kitchen
  dashboard, 27 for the delivery worker app, 91 for the admin panel.
- Generated from the website's own code (`src/api/`) and checked against the
  reference backend: every endpoint below exists there with the sign-in shown.
- If this document and the code ever disagree, the code in `src/api/` wins.

## 1. Choosing which backend the website talks to

One setting, in `.env` (copy `.env.example`):

| Setting | Use |
| --- | --- |
| `VITE_API_PROXY` | **Development.** The website calls `/api/v1/...` and Vite forwards it to this address, e.g. `http://localhost:4000` (our backend) or `http://localhost:5000` (yours). |
| `VITE_API_BASE_URL` | **Live builds.** The full API address the built website calls, e.g. `https://api.example.rw/api/v1`. Default `/api/v1` (same site). |
| `VITE_UPLOADS_ORIGIN` | Where uploaded photos are served from (defaults to `VITE_API_PROXY`). |
| `VITE_API_TIMEOUT` | Milliseconds before a request is abandoned (default 8000). |

Restart `npm run dev` (or rebuild) after changing them. Nothing else in the
code needs to change to switch backends.

For live builds the website's Content Security Policy (`vite.config.js`) only
allows connections to the address in `VITE_API_BASE_URL` and the map tiles.

## 2. General rules

**Base path.** Every path below is relative to `/api/v1`
(e.g. `GET /home/feed` is `GET /api/v1/home/feed`).

**Format.** JSON in and out (`Content-Type: application/json`), except the few
uploads marked *multipart form*. Field names are `snake_case`. IDs are
strings. Money is whole Rwandan francs (fields end in `_rwf`). Dates are ISO
8601 strings. Times of day are `"HH:mm"`.

**Signing in.** Each kind of user has its own sign-in and token:

| Who | Sign-in endpoints | Token stored as |
| --- | --- | --- |
| Customer | `POST /auth/send-otp` then `POST /auth/verify-otp` | `ofk_access_token` |
| Kitchen | `POST /vendor/auth/send-otp` then `POST /vendor/auth/verify-otp` | `ofk_vendor_token` |
| Delivery worker | `POST /driver/auth/send-otp` then `POST /driver/auth/verify-otp` | `ofk_driver_token` |
| Admin | `POST /admin/auth/login` (email + password), then `POST /admin/auth/verify-2fa` when two-step sign-in is on | `ofk_admin_token` |

- The successful sign-in response must contain **`token`** (a bearer token) and
  the user (`customer`, `vendor`, `driver` or `admin`).
- `send-otp` may return `dev_otp` (the code) on a development server; the
  website shows it so you can test without SMS.
- Every later request sends `Authorization: Bearer <token>`.
- Answer **401** when the token is missing, expired or signed out: the website
  then signs the user out. Answer **403** when signed in but not allowed.
- Sign-out: `POST /auth/logout`, `/vendor/auth/logout`, `/driver/auth/logout`,
  `/admin/auth/logout` (the website calls them with the token; 401 is fine).

**Errors.** Any non-2xx status with this body:

```json
{ "error": { "code": "GUESTS_OUT_OF_RANGE", "message": "Shown to the user as is.", "details": { "field": "why" } } }
```

The website shows `error.message` (or a top-level `message`) to the user, so
write it for people. `code` and `details` are optional.

**Lists.** A list may be returned as a bare array or inside an object
(`{ "vendors": [...] }`, `{ "items": [...] }`, …); paged lists also return
`meta: { page, limit, total }` — the website asks for the next page while
`page × limit < total`.

**Live updates.** There are no sockets: the dashboards and order pages simply
repeat their GET requests every few seconds.

## 3. What each response must contain

The website reads responses through a few mapping functions. **Every field it
uses is named there** — a new backend only has to provide those fields:

| Data | Read by (in `src/api/`) |
| --- | --- |
| Kitchens in lists, storefront, dishes, categories, search, cart, orders, specials, offers | `normalize.js` — `normalizeVendor`, `normalizeDish`, `normalizeOrder`, … (raw shapes also described in `types.js`) |
| Kitchen account, menu items, kitchen orders, stats, wallet, specials | `vendorApi.js` — `mapVendorAccount`, `mapMenuItem`, `mapOrder`, `mapStats`, `mapWallet`, `mapSpecial` |
| Delivery worker account, deliveries, stats, earnings, wallet, notifications | `driverApi.js` — `mapDriverAccount`, `mapDelivery`, `mapDriverStats`, `mapDriverEarnings`, `mapDriverWallet`, `mapDriverNotification` |
| Admin pages | `adminApi.js` returns the raw JSON; each admin page reads the fields it shows |

The mapping functions are forgiving (most fields have fallbacks), so start with
the fields a screen actually shows and add the rest as you go.

## 4. Things the backend is trusted to do

The website shows what the backend says; it never decides these itself:

- **Prices and totals** — delivery fees, event prices, deposits, commission: the
  website displays the server's numbers and sends choices, never amounts.
- **What a user may do next** — e.g. a kitchen order's `allowed_next_statuses`.
- **Handover codes** — the 6-digit codes for delivery, pick-up and events are
  created and checked by the backend.
- **Payments** — the website sends the method and phone/card details; the
  backend charges and reports `payment_status`.

## 5. Every endpoint

"Sign-in" is who must be signed in: *Public* (nobody), *Customer*, *Kitchen*,
*Kitchen (approved)* (an admin has approved the kitchen), *Delivery worker*,
*Admin* (also limited by the admin's team role) or *Owner*.

## Customer website (and public pages)

Called from `src/api/endpoints.js` (60 endpoints). The function names are in that file; each one shows the exact body it sends and how it reads the response.

### /auth

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/auth/me` | Customer | `fetchCurrentCustomer` |  |
| PUT | `/auth/me/location` | Customer | `reportCustomerLocation` | Records the signed-in customer's current GPS position on the server. |
| PATCH | `/auth/me/profile` | Customer | `updateCurrentCustomerProfile` |  |
| POST | `/auth/send-otp` | Public | `sendOtp` |  |
| POST | `/auth/verify-otp` | Public | `verifyOtp` |  |

### /banks

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/banks` | Public | `fetchBanks` | banks for withdrawals, each with its account-number length (min/max digits). |

### /cart

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| DELETE | `/cart` | Customer | `clearRemoteCart` |  |
| GET | `/cart` | Customer | `fetchCart` |  |
| POST | `/cart` | Customer | `addCartItem` |  |
| PUT | `/cart` | Customer | `replaceRemoteCart` |  |
| DELETE | `/cart/:menuItemId` | Customer | `removeCartItem` |  |
| PATCH | `/cart/:menuItemId` | Customer | `updateCartItem` |  |

### /chats

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/chats` | Customer | `list` |  |
| GET | `/chats/:id` | Customer | `get` |  |
| POST | `/chats/:id/messages` | Customer | `send` |  |
| POST | `/chats/:id/read` | Customer | `markRead` |  |
| GET | `/chats/unread-count` | Customer | `unreadCount` |  |
| POST | `/chats/with/:vendorId` | Customer | `openWithVendor` | Only for a kitchen the customer has placed an order with; otherwise **403** (`NO_ORDER_WITH_VENDOR`) with a message to show. |

### /geo

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/geo/places/autocomplete` | Public | `fetchPlaceSuggestions` | Query: `q&lat&lng`. place suggestions (areas, streets, landmarks) while a vendor types their kitchen's location. |
| GET | `/geo/places/details` | Public | `fetchPlaceDetails` | Query: `id`. a picked place: position, the box to frame ([west, south, east, north]) and, for areas, the zone outline (GeoJSON). |
| GET | `/geo/places/reverse` | Public | `fetchPlaceAt` | Query: `lat&lng`. the area and street at a point ({ area, street }). |
| GET | `/geo/route` | Public | `fetchRoute` | the road route, distance, time and steps between two points ({lat, lng}). |

### /home

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/home/categories` | Public | `fetchCategories` |  |
| GET | `/home/feed` | Public | `fetchHomeFeed` | Query: `lat={lat}&lng={lng}`. Combined home screen payload: categories + featured/nearby kitchens + popular dishes for the given coordinates. |
| GET | `/home/search` | Public | `searchHome` | Query: `q={query}&lat={lat}&lng={lng}`. |
| GET | `/home/vendors` | Public | `fetchAllVendors` | Query: `lat&lng&category_id&sort&page&limit`. every kitchen in the system, near or far; with lat/lng the nearby ones (`is_nearby`) come first. |
| GET | `/home/vendors/map` | Public | `fetchMapVendors` | Query: `lat&lng&category_id`. every kitchen whose store is open, at any distance, for exploring on the map. With lat/lng each has `distance_km` and they come nearest first. |
| GET | `/home/vendors/nearby` | Public | `fetchNearbyVendors` | Query: `lat&lng&radius&category_id&sort&page&limit`. lat:number\|string, lng:number\|string, radius?:number, category_id?:string, sort?:'distance'\|'rating', page?:number, limit?:number }} params |

### /notifications

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/notifications` | Customer | `fetchNotifications` |  |
| POST | `/notifications/:notificationId/read` | Customer | `markNotificationRead` |  |
| POST | `/notifications/read-all` | Customer | `markAllNotificationsRead` |  |

### /orders

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/orders` | Customer | `fetchOrders` | Each order's `vendor` includes `phone`, so the customer can call a kitchen they ordered from. |
| GET | `/orders/:orderId` | Customer | `fetchOrder` | Same order shape (with `vendor.phone`). |
| POST | `/orders/:orderId/cancel` | Customer | `cancelRemoteOrder` |  |
| GET | `/orders/:orderId/live` | Customer | `fetchOrderLive` | the delivery worker's live position, the road route to where they are heading (kitchen, then you) and the ETA. |
| POST | `/orders/:orderId/pay` | Customer | `payRemoteOrder` |  |
| POST | `/orders/:orderId/pay-balance` | Customer | `payEventBalance` | Big events: pay the second half (due a day before the event). |
| PUT | `/orders/:orderId/refund-destination` | Customer | `changeRefundDestination` |  |
| POST | `/orders/:orderId/switch-to-delivery` | Customer | `switchOrderToDelivery` |  |
| POST | `/orders/:orderId/switch-to-delivery/quote` | Customer | `quoteSwitchToDelivery` | A pickup order the customer now wants delivered: price it, then pay the fee and switch. |
| GET | `/orders/:orderId/track` | Customer | `fetchOrderTracking` |  |
| POST | `/orders/checkout` | Customer | `createOrder` |  |
| POST | `/orders/event-checkout` | Customer | `createEventOrder` |  |
| POST | `/orders/event-quote` | Public | `fetchEventQuote` | Big events: a kitchen's offer and price (guests, delivery or pick-up, venue), then the order. |
| GET | `/orders/payment-methods` | Public | `fetchPaymentMethods` |  |
| GET | `/orders/refunds` | Customer | `fetchRefunds` |  |

### /support

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/support` | Customer | `list` |  |
| POST | `/support` | Customer | `create` |  |
| GET | `/support/:ticketId` | Customer | `get` |  |
| POST | `/support/:ticketId/messages` | Customer | `reply` |  |
| GET | `/support/unread-count` | Customer | `unreadCount` |  |

### /vendors

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendors/:vendorId` | Public | `fetchVendorStorefront` |  |
| GET | `/vendors/:vendorId/delivery-quote` | Public | `fetchDeliveryQuote` | Query: `lat&lng`. Delivery fee priced by road distance from the kitchen to the drop-off. |
| GET | `/vendors/offers` | Public | `fetchVendorOffers` | Query: `lat&lng`. upcoming "Offer Days" from every kitchen, soonest first. |
| GET | `/vendors/specials` | Public | `fetchVendorSpecials` | Query: `lat&lng`. Active "Tomorrow's Special" announcements across nearby kitchens. |
| GET | `/vendors/types` | Public | `fetchVendorTypes` | every kitchen type with its label and description. |

### /wishlist

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/wishlist` | Customer | `fetchWishlist` |  |
| POST | `/wishlist` | Customer | `addWishlistItem` |  |
| DELETE | `/wishlist/:menuItemId` | Customer | `removeWishlistItem` |  |
| POST | `/wishlist/:menuItemId/move-to-cart` | Customer | `moveWishlistItemToCart` |  |

## Kitchen dashboard

Called from `src/api/vendorApi.js` (45 endpoints). The function names are in that file; each one shows the exact body it sends and how it reads the response.

### /home

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/home/categories` | Public | `menuCategories` | Public discovery categories (no auth) so it works during registration too. |

### /vendor/auth

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/auth/me` | Kitchen | `me` |  |
| POST (multipart form) | `/vendor/auth/register` | Public | `register` |  |
| POST | `/vendor/auth/send-otp` | Public | `sendLoginOtp` |  |
| POST | `/vendor/auth/verify-otp` | Public | `verifyLoginOtp` |  |

### /vendor/availability

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| PATCH | `/vendor/availability` | Kitchen (approved) | `setAvailability` | Open (with live GPS position) / close the store, or refresh the position. |

### /vendor/chats

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/chats` | Kitchen | `markAllNotificationsRead` |  |
| GET | `/vendor/chats/:id` | Kitchen | `` |  |
| POST | `/vendor/chats/:id/messages` | Kitchen | `` |  |
| POST | `/vendor/chats/:id/read` | Kitchen | `` |  |
| GET | `/vendor/chats/unread-count` | Kitchen | `markAllNotificationsRead` |  |

### /vendor/dashboard

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/dashboard` | Kitchen | `dashboard` |  |

### /vendor/event-package

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/event-package` | Kitchen | `eventPackage` | Big events: the kitchen's offer (guest ranges, plate, service, delivery) and form options. |
| PUT | `/vendor/event-package` | Kitchen (approved) | `saveEventPackage` |  |

### /vendor/menu

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/menu` | Kitchen | `listMenu` |  |
| POST (multipart form) | `/vendor/menu` | Kitchen | `createMenuItem` |  |
| DELETE | `/vendor/menu/:id` | Kitchen | `deleteMenuItem` |  |
| PUT (multipart form) | `/vendor/menu/:id` | Kitchen | `updateMenuItem` |  |
| PATCH | `/vendor/menu/:id/availability` | Kitchen | `setMenuAvailability` |  |
| POST | `/vendor/menu/categories` | Kitchen | `createCategory` | A kitchen adds a food category (an existing one with that name is reused). |

### /vendor/nationwide

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/nationwide` | Kitchen | `nationwide` | Nationwide events: status, platform delivery range and the kitchen's travel fee. |
| PUT | `/vendor/nationwide` | Kitchen (approved) | `saveNationwide` |  |

### /vendor/notifications

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| POST | `/vendor/notifications/:id/read` | Kitchen | `markNotificationRead` |  |
| POST | `/vendor/notifications/read-all` | Kitchen | `markAllNotificationsRead` |  |

### /vendor/offers

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/offers` | Kitchen | `offers` | "Offer Days": deals announced for a chosen future day. |
| POST | `/vendor/offers` | Kitchen (approved) | `createOffer` |  |
| DELETE | `/vendor/offers/:offerId` | Kitchen (approved) | `cancelOffer` |  |

### /vendor/ordering

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/ordering` | Kitchen | `ordering` | The kitchen type's ordering rules with today's bookings; the kitchen may change its daily order limit / minimum order (null = type default). |
| PUT | `/vendor/ordering` | Kitchen (approved) | `saveOrdering` |  |

### /vendor/orders

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/orders` | Kitchen | `listOrders` |  |
| POST | `/vendor/orders/:orderId/collect` | Kitchen (approved) | `confirmPickup` | Pickup orders: the customer collected it (vendor enters their code). |
| PATCH | `/vendor/orders/:orderId/status` | Kitchen (approved) | `updateOrderStatus` |  |

### /vendor/profile

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| PATCH | `/vendor/profile` | Kitchen (approved) | `updateProfile` |  |
| DELETE | `/vendor/profile/type-request` | Kitchen | `cancelTypeChange` |  |
| POST | `/vendor/profile/type-request` | Kitchen | `requestTypeChange` | Ask an admin to change the kitchen's vendor type, or withdraw the request. |

### /vendor/special

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| DELETE | `/vendor/special` | Kitchen (approved) | `clearSpecial` |  |
| GET | `/vendor/special` | Kitchen | `special` |  |
| PUT | `/vendor/special` | Kitchen (approved) | `saveSpecial` |  |

### /vendor/support

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/support` | Kitchen | `markAllNotificationsRead` |  |
| POST | `/vendor/support` | Kitchen | `markAllNotificationsRead` |  |
| GET | `/vendor/support/:id` | Kitchen | `markAllNotificationsRead` |  |
| POST | `/vendor/support/:id/messages` | Kitchen | `markAllNotificationsRead` |  |
| GET | `/vendor/support/unread-count` | Kitchen | `markAllNotificationsRead` |  |

### /vendor/wallet

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/vendor/wallet` | Kitchen | `wallet` |  |
| POST | `/vendor/wallet/withdrawals` | Kitchen (approved) | `requestWithdrawal` |  |

## Delivery worker app

Called from `src/api/driverApi.js` (27 endpoints). The function names are in that file; each one shows the exact body it sends and how it reads the response.

### /driver/auth

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/driver/auth/me` | Delivery worker | `me` |  |
| POST | `/driver/auth/register` | Public | `register` |  |
| POST | `/driver/auth/send-otp` | Public | `sendLoginOtp` |  |
| POST | `/driver/auth/verify-otp` | Public | `verifyLoginOtp` |  |

### /driver/availability

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| PATCH | `/driver/availability` | Delivery worker | `setAvailability` |  |

### /driver/deliveries

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/driver/deliveries/:deliveryId/navigation` | Delivery worker | `navigation` | Route + turn-by-turn steps to the kitchen, then the customer. |
| POST | `/driver/deliveries/:id/accept` | Delivery worker | `acceptDelivery` |  |
| POST | `/driver/deliveries/:id/confirm-delivery` | Delivery worker | `confirmDelivery` |  |
| POST | `/driver/deliveries/:id/reject` | Delivery worker | `rejectDelivery` |  |
| PATCH | `/driver/deliveries/:id/status` | Delivery worker | `updateStatus` |  |
| GET | `/driver/deliveries/active` | Delivery worker | `active` |  |
| GET | `/driver/deliveries/available` | Delivery worker | `available` |  |
| GET | `/driver/deliveries/earnings` | Delivery worker | `earnings` |  |
| GET | `/driver/deliveries/history` | Delivery worker | `history` |  |

### /driver/location

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| PATCH | `/driver/location` | Delivery worker | `updateLocation` | heading (degrees), speed_mps and accuracy_m are optional GPS extras. |

### /driver/notifications

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/driver/notifications` | Delivery worker | `notifications` |  |
| POST | `/driver/notifications/:id/read` | Delivery worker | `markNotificationRead` |  |
| POST | `/driver/notifications/read-all` | Delivery worker | `markAllNotificationsRead` |  |

### /driver/profile

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| PATCH | `/driver/profile` | Delivery worker | `updateProfile` |  |

### /driver/stats

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/driver/stats` | Delivery worker | `stats` |  |

### /driver/support

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/driver/support` | Delivery worker | `markAllNotificationsRead` |  |
| POST | `/driver/support` | Delivery worker | `markAllNotificationsRead` |  |
| GET | `/driver/support/:id` | Delivery worker | `markAllNotificationsRead` |  |
| POST | `/driver/support/:id/messages` | Delivery worker | `markAllNotificationsRead` |  |
| GET | `/driver/support/unread-count` | Delivery worker | `markAllNotificationsRead` |  |

### /driver/wallet

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/driver/wallet` | Delivery worker | `wallet` | Wallet: balance from completed deliveries, withdrawals to mobile money. |
| POST | `/driver/wallet/withdrawals` | Delivery worker | `requestWithdrawal` |  |

## Admin panel

Called from `src/api/adminApi.js` (91 endpoints). The function names are in that file; each one shows the exact body it sends and how it reads the response.

### /admin/actions

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/actions` | Admin | `listActions` |  |

### /admin/analytics

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/analytics/overview` | Admin | `analyticsOverview` |  |
| GET | `/admin/analytics/payouts` | Admin | `analyticsPayouts` |  |
| GET | `/admin/analytics/sales` | Admin | `analyticsSales` |  |

### /admin/auth

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| POST | `/admin/auth/2fa/disable` | Admin | `disableTwoFactor` |  |
| POST | `/admin/auth/2fa/enable` | Admin | `enableTwoFactor` |  |
| POST | `/admin/auth/2fa/start` | Admin | `startTwoFactor` |  |
| POST | `/admin/auth/action-code` | Admin | `sendActionCode` |  |
| POST | `/admin/auth/change-password` | Admin | `changePassword` |  |
| GET | `/admin/auth/invitations/:token` | Public | `getInvitation` | Invitation link (no sign-in) |
| POST | `/admin/auth/invitations/:token/accept` | Public | `acceptInvitation` |  |
| POST | `/admin/auth/login` | Public | `login` |  |
| GET | `/admin/auth/me` | Admin | `me` |  |
| POST | `/admin/auth/verify-2fa` | Public | `verifyTwoFactor` | SMS codes: second sign-in step, setup, and codes confirming money actions. |

### /admin/categories

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/categories` | Admin | `listCategories` |  |
| POST | `/admin/categories` | Admin | `createCategory` |  |
| PUT | `/admin/categories/:id` | Admin | `updateCategory` |  |
| PATCH | `/admin/categories/reorder` | Admin | `reorderCategories` |  |

### /admin/chats

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/chats` | Admin | `listChats` | Customer–kitchen chats, read only. |
| GET | `/admin/chats/:id` | Admin | `getChat` |  |

### /admin/commissions

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/commissions` | Admin | `listCommissions` |  |
| POST | `/admin/commissions` | Admin | `createCommission` |  |
| DELETE | `/admin/commissions/:id` | Admin | `deleteCommission` |  |
| PUT | `/admin/commissions/:id` | Admin | `updateCommission` |  |

### /admin/complaints

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/complaints` | Admin | `listComplaints` |  |
| POST | `/admin/complaints` | Admin | `createComplaint` |  |
| GET | `/admin/complaints/:id` | Admin | `getComplaint` |  |
| PATCH | `/admin/complaints/:id` | Admin | `updateComplaint` |  |

### /admin/dashboard

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/dashboard/overview` | Admin | `dashboard` |  |

### /admin/deliveries

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/deliveries/:deliveryId/live` | Admin | `deliveryLive` | One delivery's rider position, route and ETA. |
| GET | `/admin/deliveries/live` | Admin | `liveDeliveries` |  |

### /admin/drivers

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/drivers` | Admin | `listDrivers` |  |
| GET | `/admin/drivers/:id` | Admin | `getDriver` |  |
| PATCH | `/admin/drivers/:id/status` | Admin | `setDriverStatus` |  |
| GET | `/admin/drivers/counts` | Admin | `driverCounts` |  |

### /admin/notifications

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/notifications` | Admin | `listNotifications` |  |
| POST | `/admin/notifications/:id/read` | Admin | `markNotificationRead` |  |
| POST | `/admin/notifications/read-all` | Admin | `markAllNotificationsRead` |  |

### /admin/operations

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/operations/delivery-timing` | Admin | `deliveryTiming` |  |
| PUT | `/admin/operations/delivery-timing` | Admin | `saveDeliveryTiming` |  |
| GET | `/admin/operations/late-pickups` | Admin | `latePickups` |  |
| GET | `/admin/operations/live-map` | Admin | `liveMap` | Operations: live map, late pickups, rules in force. |
| GET | `/admin/operations/rules` | Admin | `operationsRules` |  |
| PUT | `/admin/operations/rules` | Admin | `saveOperationsRules` | Dispatch and customer-pickup rules (notification radius, re-offer interval...). |

### /admin/orders

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/orders` | Admin | `listOrders` |  |
| GET | `/admin/orders/:id` | Admin | `getOrder` |  |
| POST | `/admin/orders/:id/cancel` | Admin | `cancelOrder` |  |
| GET | `/admin/orders/:id/nearby-drivers` | Admin | `nearbyDrivers` | Delivery workers near the kitchen, for support to call before reassigning. |
| POST | `/admin/orders/:id/reassign-driver` | Admin | `reassignDriver` |  |
| PATCH | `/admin/orders/:id/status` | Admin | `updateOrderStatus` |  |

### /admin/payments

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/payments` | Admin | `listPayments` |  |
| GET | `/admin/payments/summary` | Admin | `paymentSummary` |  |

### /admin/payouts

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/payouts` | Admin | `listPayouts` |  |
| PATCH | `/admin/payouts/:id` | Admin | `updatePayout` |  |
| GET | `/admin/payouts/balances` | Admin | `payoutBalances` |  |
| GET | `/admin/payouts/summary` | Admin | `payoutSummary` |  |

### /admin/platform

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/platform/owner` | Owner | `ownerOverview` | The owner's platform money (super admin only). |
| POST | `/admin/platform/owner/adjustments` | Owner | `ownerAdjustment` |  |
| POST | `/admin/platform/owner/destinations` | Owner | `ownerAddDestination` |  |
| POST | `/admin/platform/owner/destinations/:id/remove` | Owner | `ownerRemoveDestination` |  |
| PUT | `/admin/platform/owner/payout-settings` | Owner | `ownerSavePayoutSettings` |  |
| POST | `/admin/platform/owner/reconciliations` | Owner | `ownerReconciliation` |  |
| POST | `/admin/platform/owner/withdrawals` | Owner | `ownerWithdraw` |  |
| POST | `/admin/platform/owner/withdrawals/:id/cancel` | Owner | `ownerCancelWithdrawal` |  |
| POST | `/admin/platform/owner/withdrawals/:id/complete` | Owner | `ownerCompleteWithdrawal` |  |
| GET | `/admin/platform/transactions` | Admin | `platformTransactions` |  |
| GET | `/admin/platform/wallet` | Admin | `platformWallet` | The platform's money books (finance role). |

### /admin/refunds

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/refunds` | Admin | `listRefunds` |  |
| PATCH | `/admin/refunds/:id` | Admin | `updateRefund` |  |

### /admin/settings

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/settings/banks` | Admin | `bankFormats` | Banks for withdrawals and each bank's account-number length. |
| PUT | `/admin/settings/banks` | Admin | `saveBankFormats` |  |
| GET | `/admin/settings/delivery-fees` | Admin | `deliveryFees` | Delivery timing rules (warning / late charge / automatic reassign), in minutes. Delivery fee by distance ranges. |
| PUT | `/admin/settings/delivery-fees` | Admin | `saveDeliveryFees` |  |

### /admin/team

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/team` | Admin | `listTeam` | Team (owner only) |
| DELETE | `/admin/team/:id` | Admin | `removeMember` |  |
| POST | `/admin/team/:id/deactivate` | Admin | `deactivateMember` |  |
| POST | `/admin/team/:id/reactivate` | Admin | `reactivateMember` |  |
| POST | `/admin/team/:id/resend-invitation` | Admin | `resendInvitation` |  |
| PATCH | `/admin/team/:id/role` | Admin | `changeMemberRole` |  |
| POST | `/admin/team/invitations` | Admin | `inviteMember` |  |

### /admin/users

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/users` | Admin | `listUsers` |  |
| GET | `/admin/users/:id` | Admin | `getUser` |  |
| POST | `/admin/users/:id/erase` | Admin | `eraseCustomer` | Erases a customer's personal data on request (cannot be undone). |
| PATCH | `/admin/users/:id/status` | Admin | `setUserStatus` |  |

### /admin/vendors

| Method | Path | Sign-in | Website function | Notes |
| --- | --- | --- | --- | --- |
| GET | `/admin/vendors` | Admin | `listVendors` |  |
| GET | `/admin/vendors/:id` | Admin | `getVendor` |  |
| POST | `/admin/vendors/:id/documents/review` | Admin | `reviewVendorDocuments` |  |
| PATCH | `/admin/vendors/:id/nationwide` | Admin | `setVendorNationwide` | Nationwide events: true / false, or null for the type default (Caterers on). |
| PATCH | `/admin/vendors/:id/status` | Admin | `setVendorStatus` |  |
| PATCH | `/admin/vendors/:id/type` | Admin | `setVendorType` | { vendor_type } to set it directly, or { decision: 'approve' \| 'reject' } for the vendor's request. |
| GET | `/admin/vendors/counts` | Admin | `vendorCounts` |  |

