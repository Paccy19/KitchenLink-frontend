# KitchenLink — Frontend

The KitchenLink website: the customer marketplace, the kitchen dashboard, the
delivery worker app and the admin panel, in one React (Vite) app.

## Connecting a backend

This website works with **any backend that follows [API_CONTRACT.md](API_CONTRACT.md)**
— every request the website makes, who must be signed in, and the response
rules. The reference backend is **KitchenLink-backend**.

Which backend it talks to is one setting in `.env` (copy `.env.example`):

```bash
VITE_API_PROXY=http://localhost:4000      # development: the backend's address
# VITE_API_BASE_URL=https://api.example.rw/api/v1   # live builds
```

Change it, restart `npm run dev`, and the website uses the other backend. No
code changes.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

## Demo mode (no backend needed)

```bash
npm run demo       # http://localhost:3000, running on demo data
```

The website answers its own API calls in the browser with demo data
(`src/demo/`): kitchens and menus around Kigali, orders, delivery workers and
an admin panel. Nothing is sent to a server.

| Sign in as | How |
| --- | --- |
| Customer | Any phone number, code `123456` |
| Kitchen (`/vendor-login`) | Any phone number, code `123456` — opens *Inzu Heritage Kitchen* |
| Delivery worker (`/driver-login`) | Any phone number, code `123456` |
| Admin (`/admin-login`) | Any email and password |

Changes (orders, menu edits, withdrawals…) are kept in the browser until you
press **Reset demo data** in the "Demo data" badge, bottom left. An order a
customer places moves through the kitchen and delivery steps by itself over a
few minutes, unless you act on it from the kitchen or delivery worker
dashboards (sign in as them in turn — one role at a time). Pick-up codes and
delivery codes are shown in the error message if you type a wrong one.

Every endpoint in [API_CONTRACT.md](API_CONTRACT.md) has demo data: browsing,
cart, checkout, big events (deposit and balance), pick-up → delivery switch,
refunds, live delivery tracking and navigation, chats, support, the kitchen
and delivery worker dashboards, and every admin screen (payouts, refunds,
platform wallet and books, analytics, complaints, team and invitations, audit
log, delivery rules and fees, SMS sign-in codes). Any SMS code is `123456`.

`npm run build:demo` builds a demo copy of the site (`dist/`) to host
anywhere without a backend. Ordinary builds don't include the demo code.

### Removing demo mode

Demo mode lives in `src/demo/` and touches nothing else except these lines:

1. Delete the `src/demo/` folder and the `.env.demo` file.
2. In `src/main.jsx`, replace the `if (import.meta.env.VITE_DEMO_MODE === 'true') { … } else { render(); }`
   block at the bottom with `render();`.
3. In `package.json`, remove the `demo` and `build:demo` scripts.
4. Remove `VITE_DEMO_MODE` from `.env.example` and this "Demo mode" section
   (and its row in the environment variables table) from the README.

Production build:

```bash
npm run build      # outputs dist/
npm run preview
```

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Base URL for all API calls. In development, Vite proxies `/api` to `http://localhost:4000`; set `VITE_API_PROXY` to override the backend host. |
| `VITE_API_TIMEOUT` | `8000` | Request timeout in ms. |
| `VITE_DEMO_MODE` | `false` | `true` runs the website on built-in demo data, no backend (set by `npm run demo`). |
| `VITE_CARTO_API_KEY` | _(empty)_ | Optional CARTO basemap key for the nearby-kitchens map at `/vendors/map` (CARTO Voyager tiles rendered with MapLibre GL). The map works without a key on CARTO's free tier; commercial use requires a CARTO plan. |

Start the backend and MongoDB alongside Vite to use the connected API. Customer
OTP authentication, cart, wishlist, checkout, order history, tracking, and
cancellation use `/api/v1` endpoints. The development OTP is returned by the
backend only outside production. Saved addresses are stored in the browser.
Checkout supports Mobile Money, Cards, eKash, and Wallet. These run against
mock providers until real payment integrations are configured.

## Architecture

```
src/
├── api/                  API service layer (no React)
│   ├── client.js         authenticated fetch wrapper + timeout
│   ├── endpoints.js      discovery and customer endpoint functions
│   ├── types.js          JSDoc typedefs of the raw JSON contracts
│   ├── normalize.js      snake_case payloads → camelCase view-models
├── hooks/                React Query hooks + small UI hooks
│   ├── useHomeFeed.js        GET /home/feed
│   ├── useCategories.js      GET /home/categories
│   ├── useNearbyVendors.js   GET /home/vendors/nearby (infinite scroll)
│   ├── useSearch.js          GET /home/search (350 ms debounce)
│   ├── useVendorStorefront.js GET /vendors/{id}
│   ├── useDebounce.js, usePullToRefresh.js, useRecentSearches.js
├── context/              LocationContext (GPS, fallback, manual),
│                         AuthContext, CartContext, OrderContext
├── components/
│   ├── common/           Skeletons, EmptyState/ErrorState, Toasts,
│   │                     LazyImage, ErrorBoundary
│   └── home/             SearchBar, CategoryBar, VendorCard, DishCard,
│                         HomeFeed, SearchResults, LocationIndicator,
│                         LocationPrimer, PullToRefreshIndicator
└── pages/                HomePage, VendorsPage, VendorPage (storefront),
                          CheckoutPage, OrdersHistoryPage, …
```

Data flow for every screen:

```
endpoints.js (raw JSON contract)
   → hooks/*.js  (React Query: caching, background refetch, normalisation)
      → components (presentational, typed view-models)
```

## API endpoints consumed

| Endpoint | Purpose | Hook |
| --- | --- | --- |
| `GET /api/v1/home/feed?lat&lng` | Combined home screen: categories + featured/nearby kitchens + popular dishes | `useHomeFeed` |
| `GET /api/v1/home/categories` | Persistent category bar | `useCategories` |
| `GET /api/v1/home/vendors/nearby?lat&lng&radius&category_id&sort&page` | Filtered/sorted nearby kitchens with pagination | `useNearbyVendors` |
| `GET /api/v1/home/search?q&lat&lng` | Global search (dishes + kitchens) | `useSearch` |
| `GET /api/v1/vendors/{vendor_id}` | Full storefront with categorised menu | `useVendorStorefront` |
| `POST /api/v1/auth/send-otp`, `POST /api/v1/auth/verify-otp` | Customer OTP sign-in and bearer-token session |
| `GET/POST/PATCH/DELETE/PUT /api/v1/cart` | Authenticated cart management |
| `GET/POST/DELETE /api/v1/wishlist` | Authenticated saved dishes |
| `POST /api/v1/orders/checkout`, `GET /api/v1/orders` | Checkout and customer order history |
| `GET /api/v1/orders/{id}`, `GET /api/v1/orders/{id}/track`, `POST /api/v1/orders/{id}/cancel` | Order detail, tracking, and cancellation |

Field mapping between the raw contracts (snake_case) and the UI view-models
(camelCase) lives in `src/api/normalize.js` — e.g. `price_rwf → price`,
`vendor_type → type`, `distance_km → distanceKm`,
`estimated_prep_time → prepTime`. Prices are always rendered as `RWF 2,500`.

## Testing location-based features

The app requests geolocation on first load **after** showing a clear
explanation primer (`LocationPrimer`).

1. **Grant permission** → distances are computed from your real coordinates.
2. **Deny permission** → the app falls back to Kigali city centre
   (`-1.9441, 30.0619`) and shows a subtle notice; every request still
   receives `lat`/`lng`.
3. **Manual change** → click the location pill in the header to pick a
   Kigali neighbourhood (Kimironko, Remera, Kacyiru…); coordinates are
   persisted in `localStorage`.

Simulate GPS in Chrome DevTools:

1. DevTools → ⋮ → More tools → **Sensors**.
2. Set *Location* to a custom tab (e.g. `-1.9441, 30.0619` for central Kigali,
   or `-1.9597, 30.0587` for Kimironko) and reload.
3. Nearby distances, feed ordering and the `radius` filter update immediately.

Simulate a denied prompt: DevTools → Application → Permissions → Geolocation →
*Block*, then reload (clear `ofk_location_v1` / `ofk_location_primer_v1` from
`localStorage` to re-trigger the primer).

Use an area with no active vendors to check the "No kitchens in this radius"
empty state and verify empty/error handling against the backend.

## Key UX behaviours

- **Debounced live search** (350 ms) with recent searches, suggestion chips and
  tabbed results (Dishes / Kitchens); client-side highlight of matches.
- **Pull-to-refresh** on the homepage (touch) plus an accessible refresh button.
- **Infinite scroll** on `/vendors` (IntersectionObserver + “Load more” fallback)
  with radius (3–15 km, default 7 km) and sort (Distance / Rating / Prep Time).
- **Skeleton loaders** for every data section, empty states with recovery
  actions, error states with retry, and toast notifications for failures.
- **Code splitting**: vendor storefront, vendors list, search results and the
  rest of the routes are lazy-loaded chunks.
- **Accessibility**: labelled search, ARIA tab semantics, focus-visible rings,
  `aria-live` toasts, keyboard-navigable category bar.
- **Responsive**: mobile-first (360–430 px), scales to tablet/desktop grids.

## Manual flows to verify

1. Open `/` → allow location → feed loads categories, featured kitchens and
   popular dishes → pull down to refresh.
2. Tap **Local Food** in the category bar → `/vendors?category=local` filtered
   list → switch sort to *Prep Time*, widen radius to 15 km.
3. Type `Isombe` in the homepage search → after 350 ms the tabbed results view
   appears with matching dishes and kitchens.
4. Tap a kitchen → storefront with banner, rating, prep time, delivery badge,
   category tabs, menu items with `RWF 2,500` pricing → *Add* → sticky
   **View Cart** bar.
5. Deny GPS → the feed still works using the Kigali fallback coordinates.
