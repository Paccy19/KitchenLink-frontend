# Online Food Kitchen — Frontend

Mobile-first customer storefront for the Online Food Kitchen multi-vendor
marketplace: discover nearby kitchens and home cooks, browse menus, search
dishes and order food.

## Quick start

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build      # outputs dist/
npm run preview
```

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Base URL for every API call (`/home/feed`, `/home/categories`, `/home/vendors/nearby`, `/home/search`, `/vendors/{id}`). |
| `VITE_USE_MOCK` | `auto` | `auto` = call the real API first, fall back to the built-in mock server when it is unreachable. `true` = always mock. `false` = never mock. |
| `VITE_API_TIMEOUT` | `8000` | Request timeout in ms. |

> The backend is still under construction, so the app ships with a mock server
> (`src/api/mock/mockServer.js`) that returns the exact JSON contracts the
> backend will return — including realistic Kigali coordinates, so distance,
> radius filtering and sorting all behave like production.

## Architecture

```
src/
├── api/                  API service layer (no React)
│   ├── client.js         fetch wrapper + timeout + mock fallback
│   ├── endpoints.js      one function per backend endpoint
│   ├── types.js          JSDoc typedefs of the raw JSON contracts
│   ├── normalize.js      snake_case payloads → camelCase view-models
│   └── mock/             offline mock server (contract-accurate)
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

Because the mock backend is coordinate-aware, moving the simulated location
away from Kigali (e.g. to Nairobi) shows the "No kitchens in this radius"
empty state — useful for testing empty/error handling.

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

## Sample flows to verify

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
