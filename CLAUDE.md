# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The KitchenLink website: the customer marketplace, kitchen (vendor) dashboard, delivery worker (driver) app and admin panel, all in one React 18 + Vite app. It runs against any backend that follows [API_CONTRACT.md](API_CONTRACT.md). The reference one is `../KitchenLink-backend`.

## Commands

```bash
npm install
cp .env.example .env    # set VITE_API_PROXY to the backend (default http://localhost:4000)
npm run dev             # http://localhost:3000, proxies /api to VITE_API_PROXY
npm run demo            # no backend: the browser answers every API call with demo data
npm run build           # → dist/  (npm run preview to serve it)
npm run build:demo      # a demo build that needs no backend
```

There are no tests or linter in this repo. To check a change, run `npm run build` and test the screen in `npm run demo` or against the backend.

Demo sign-ins: any phone number with code `123456` works for customers, `/vendor-login` and `/driver-login`. Any email and password works for `/admin-login`.

## Architecture

**`src/api/` is the contract.** `API_CONTRACT.md` was generated from it, and if they disagree, the code wins.
- `client.js` is a fetch wrapper: base URL from `VITE_API_BASE_URL`, a timeout from `VITE_API_TIMEOUT`, and errors turned into `ApiError` with `status`, `code` and `details`.
- The endpoint functions are split by role: `endpoints.js` (customer and public), `vendorApi.js`, `driverApi.js` and `adminApi.js`.
- `session.js` stores one token per role: `ofk_access_token`, `ofk_vendor_token`, `ofk_driver_token` and `ofk_admin_token`.

**Mapping layer.** Raw `snake_case` JSON becomes `camelCase` view-models in `normalize.js` (`normalizeVendor`, `normalizeDish`, `normalizeOrder`, …) and in the `map*` functions in `vendorApi.js` and `driverApi.js`. `types.js` documents the raw shapes. Admin pages are the exception: `adminApi.js` returns raw JSON and each admin page reads its own fields. Every field a screen uses must go through these mappers, which have fallbacks.

**Data flow.** `src/api` → React Query hooks in `src/hooks/` → presentational components. Cross-screen state lives in the contexts in `src/context/`: Auth, Vendor, Driver and Admin sessions, plus Cart, Order, Wishlist, Location, Notification and Theme. All providers are nested in `src/main.jsx`.

**Live updates without sockets.** Every successful non-GET request calls `notifyDataChanged` (`api/liveUpdates.js`), and open dashboards reload on it. Changes made by other people show up through periodic polling (`useAutoRefresh`). Background calls that shouldn't trigger a reload go in `QUIET_PATHS`.

**Routing.** `src/App.jsx` uses react-router v7 with lazy-loaded pages. The pages for the four roles are in `src/pages/` (customer), `pages/vendor/`, `pages/driver/` and `pages/admin/`. Each dashboard role has a layout in `components/<role>-dashboard/`.

**Demo mode** (`VITE_DEMO_MODE=true`):
- `src/demo/index.js` patches `fetch` and answers every call under the API base in the browser with `src/demo/server.js` and `seed.js`.
- State persists in the browser until "Reset demo data".
- It's imported dynamically only in demo mode (the bottom of `src/main.jsx`), so normal builds don't include it.
- Every endpoint in the contract has demo data. **When you add or change an endpoint, update `src/demo/server.js` as well**, or demo mode breaks for that screen.

**Content Security Policy.** Production builds inject a CSP `<meta>` tag (`vite.config.js`). Connections are allowed only to `VITE_API_BASE_URL` and CARTO tiles, and images only to the API and uploads origin (`VITE_UPLOADS_ORIGIN`, defaulting to `VITE_API_PROXY`). A new outside service has to be added there, or the browser blocks it in production even though it works in dev.

**Maps.** The nearby-kitchens map (`/vendors/map`) uses MapLibre GL with CARTO Voyager tiles (`src/lib/mapStyle.js`, optional `VITE_CARTO_API_KEY`). Location comes from GPS. If permission is denied it falls back to Kigali centre (`-1.9441, 30.0619`), or the user picks a neighbourhood manually. The choice persists in `localStorage` (`ofk_location_v1`).

## Rules from the contract

- The backend is trusted for prices, fees, deposits, commission, which actions are allowed next (`allowed_next_statuses`), handover codes and payment status. The UI shows the server's numbers and sends the user's choices, never amounts.
- Show `error.message` to the user as is.
- Paged lists fetch the next page while `page × limit < total`.
- Prices render as `RWF 2,500`.
- A 401 signs that role out. A 403 means signed in but not allowed.
- When an endpoint changes, update `src/api/`, `API_CONTRACT.md`, `src/demo/server.js`, and the matching backend route in `../KitchenLink-backend`.
