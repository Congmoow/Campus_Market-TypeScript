# Frontend Architecture

> Campus Market Frontend — React 18 SPA

---

## Table of Contents

- [Overview](#overview)
- [Layer Diagram](#layer-diagram)
- [Entry & Bootstrap](#entry--bootstrap)
- [Routing](#routing)
- [Authentication System](#authentication-system)
- [HTTP Layer](#http-layer)
- [API Module](#api-module)
- [Pages](#pages)
- [Components](#components)
- [Lib / Utilities](#lib--utilities)
- [Styling](#styling)
- [Build & Bundling](#build--bundling)
- [Key Design Decisions](#key-design-decisions)

---

## Overview

The frontend is a client-side React SPA bundled by Vite. All page transitions happen in the browser; the server only serves the static `index.html` plus assets. API communication uses a single Axios instance that transparently handles JWT access tokens and silent refresh.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / DOM                        │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  App.tsx  (Router)                        │
│   Route guards: ProtectedRoute | AdminRoute               │
│   All pages are React.lazy() — code-split per route       │
└──────┬────────────────────────────────────────┬──────────┘
       │ pages/                                  │ components/
┌──────▼──────────┐                   ┌──────────▼──────────┐
│  Page Components │                   │  Shared UI Components│
│  (route-scoped)  │                   │  Navbar, ProductCard │
│  Home, Market,   │                   │  AuthModal, Toast    │
│  ProductDetail,  │                   │  EditProductModal …  │
│  Orders, Admin … │                   └─────────────────────┘
└──────┬──────────┘
       │ lib/  +  api/
┌──────▼──────────────────────────────────────────────────┐
│  lib/auth.ts       Module-level auth session singleton   │
│  lib/http.ts       Axios instance + interceptors         │
│  lib/http.ts       → auto-attach Bearer token            │
│  lib/http.ts       → silent refresh on 401               │
│  api/index.ts      Typed API request functions           │
│  lib/utils.ts      General-purpose helpers               │
│  lib/user-display.ts, product-categories.ts …            │
└──────┬──────────────────────────────────────────────────┘
       │ VITE_API_URL  (default /api  →  nginx proxy)
┌──────▼──────────────────────────────────────────────────┐
│               Backend REST API  (/api/*)                  │
└─────────────────────────────────────────────────────────┘
```

---

## Entry & Bootstrap

```
index.html
  └─ src/main.tsx          React root render
       └─ src/App.tsx      Router, lazy routes, auth restore
```

`App.tsx` calls `restoreAuthSession()` in a `useEffect` on first mount. This silently tries to refresh the access token via the `httpOnly` refresh cookie, then fetches `/auth/me` to hydrate the session state before any protected route renders.

---

## Routing

All routes are declared in `src/App.tsx` using **React Router v6**.

| Route            | Component       | Guard            |
| ---------------- | --------------- | ---------------- |
| `/`              | `Home`          | —                |
| `/login`         | `Login`         | —                |
| `/market`        | `Marketplace`   | —                |
| `/search`        | `SearchResults` | —                |
| `/product/:id`   | `ProductDetail` | —                |
| `/user/:id`      | `UserProfile`   | —                |
| `/publish`       | `Publish`       | `ProtectedRoute` |
| `/checkout/:id`  | `Checkout`      | `ProtectedRoute` |
| `/order-success` | `OrderSuccess`  | `ProtectedRoute` |
| `/order/:id`     | `OrderDetail`   | `ProtectedRoute` |
| `/my-products`   | `MyProducts`    | `ProtectedRoute` |
| `/my-orders`     | `MyOrders`      | `ProtectedRoute` |
| `/my-favorites`  | `MyFavorites`   | `ProtectedRoute` |
| `/chat`          | `Chat`          | `ProtectedRoute` |
| `/admin`         | `Admin`         | `AdminRoute`     |
| `*`              | `NotFound`      | —                |

**Route Guards:**

- `ProtectedRoute` — redirects to `/login` (preserving `from` state) when `status === 'unauthenticated'`; shows loading fallback while `status === 'loading'`
- `AdminRoute` — extends `ProtectedRoute`; additionally redirects to `/` if `user.role !== 'ADMIN'`

**Code Splitting:** Every page component is wrapped in `React.lazy()`. The shared `<Suspense>` boundary at the router root shows `AppFallback` during chunk loading.

`ScrollToTop` resets the scroll position to `(0, 0)` on every pathname change (skipped inside jsdom test environments).

---

## Authentication System

**File:** `src/lib/auth.ts`

The auth system is a **module-level singleton** — no Context, no Zustand, no Redux.

### State shape

```ts
interface AuthSessionState {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: User | null;
}
```

### Token storage

| Token                           | Storage                            | Rationale                                         |
| ------------------------------- | ---------------------------------- | ------------------------------------------------- |
| Access token (JWT, short-lived) | Module-level variable (in-memory)  | Invisible to XSS; never written to `localStorage` |
| Refresh token (long-lived)      | `httpOnly` cookie (set by backend) | Invisible to JavaScript                           |

Any leftover tokens in `localStorage` from older app versions are cleared on startup.

### Session lifecycle

```
App mount
  └─ restoreAuthSession()
       ├─ no access token in memory?
       │    └─ POST /auth/refresh  (sends refresh cookie)
       │         ├─ success → store access token in memory
       │         └─ failure → status = 'unauthenticated'
       └─ GET /auth/me
            ├─ success → status = 'authenticated', user = payload
            └─ failure → status = 'unauthenticated'
```

### Reactive subscription

`useAuthSession()` wraps `useSyncExternalStore`, subscribing to a `Set<() => void>` of listeners that are notified on every `setSessionState()` call. Components re-render only when the session state changes.

### Public API

| Function                      | Purpose                                          |
| ----------------------------- | ------------------------------------------------ |
| `useAuthSession()`            | React hook — returns current session state       |
| `restoreAuthSession()`        | Called once on app mount to hydrate the session  |
| `setAuthSession(token, user)` | Called after successful login                    |
| `clearAuthState(reason?)`     | Called on logout or forced sign-out              |
| `updateAuthSessionUser(user)` | Called after profile edits                       |
| `logout()`                    | Calls `POST /auth/logout`, then `clearAuthState` |
| `isAuthenticated()`           | Sync predicate                                   |
| `isAdmin()`                   | Sync predicate                                   |
| `getCurrentUser()`            | Returns `user + token` or `null`                 |

---

## HTTP Layer

**File:** `src/lib/http.ts`

A thin wrapper around a single Axios instance. The module exposes a `request` object with typed `get / post / put / patch / delete / request` methods that unwrap `response.data` automatically.

### Axios instance configuration

| Option            | Value                                        |
| ----------------- | -------------------------------------------- |
| `baseURL`         | `VITE_API_URL` (trimmed) or `/api` (default) |
| `timeout`         | 10 000 ms                                    |
| `withCredentials` | `true` (sends refresh cookie)                |

### Request interceptor

Attaches `Authorization: Bearer <token>` from the in-memory access token. Skipped when `skipAuthToken: true` (e.g., for the refresh call itself).

### Response interceptor (401 handling)

```
Response 401 received
  ├─ config.skipAuthFailureHandler = true  → reject immediately
  ├─ config._retry = true                  → onUnauthorized() + reject
  └─ otherwise
       ├─ attempt refreshAccessTokenOnce()  (deduplicated — one in-flight at a time)
       │    ├─ success → retry original request with new token
       │    └─ failure → onUnauthorized() + reject
       └─ onUnauthorized() clears auth state
```

The deduplication guard (`refreshAccessTokenPromise`) ensures concurrent 401 responses trigger only one refresh call.

### Auth bridge

`configureHttpClientAuth()` (called from `lib/auth.ts`) injects three callbacks:

- `getAccessToken` — reads in-memory token
- `refreshAccessToken` — calls `POST /auth/refresh`
- `onUnauthorized` — calls `clearAuthState('unauthorized')`

This decouples the HTTP module from the auth module (no circular import).

---

## API Module

**File:** `src/api/index.ts`

Exports typed functions for every backend endpoint. Each function calls the `request` wrapper from `lib/http.ts` and returns the inner `data` payload typed against the corresponding DTO from `@campus-market/shared`.

Examples:

```ts
getProducts(params); // GET /products
createOrder(productId); // POST /orders
uploadProductImage(file); // POST /upload/product
```

---

## Pages

Each file in `src/pages/` maps 1-to-1 with a route. Pages own their local data-fetching logic (typically `useEffect` + `useState`), form state, and display logic.

| Page            | Responsibility                                            |
| --------------- | --------------------------------------------------------- |
| `Home`          | Hero banner + featured product showcase                   |
| `Marketplace`   | Full product listing with category and price filters      |
| `SearchResults` | Search query results                                      |
| `ProductDetail` | Single product view, add to favorites, initiate checkout  |
| `Publish`       | Create new product listing with image upload              |
| `MyProducts`    | Seller's own listings with inline edit/delete             |
| `MyOrders`      | Buyer's order history and status tracking                 |
| `MyFavorites`   | Favorited products                                        |
| `Checkout`      | Order confirmation and payment simulation                 |
| `OrderSuccess`  | Post-purchase confirmation screen                         |
| `OrderDetail`   | Single order detail and status timeline                   |
| `UserProfile`   | Public user profile                                       |
| `Chat`          | In-app messaging between buyer and seller                 |
| `Login`         | Unified login / register entry (delegates to `AuthModal`) |
| `Admin`         | Admin dashboard — user/product/order management           |
| `NotFound`      | 404 fallback                                              |

---

## Components

Shared UI components in `src/components/`:

| Component                  | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `Navbar`                   | Top navigation bar — search, auth state, user menu |
| `ProductCard`              | Reusable product tile used in listing pages        |
| `AuthModal`                | Login / register modal form                        |
| `EditProductModal`         | Modal form to edit an existing product             |
| `EditProfileModal`         | Modal form to update user profile                  |
| `Hero`                     | Landing page hero section                          |
| `LazyLottie`               | Lazy-loaded Lottie animation wrapper               |
| `Toast` / `ToastContainer` | Ephemeral notification messages                    |

---

## Lib / Utilities

| File                        | Exports                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| `lib/auth.ts`               | Auth session singleton (see [Authentication System](#authentication-system)) |
| `lib/http.ts`               | Axios wrapper (see [HTTP Layer](#http-layer))                                |
| `lib/utils.ts`              | `cn()` — Tailwind class merge helper                                         |
| `lib/user-display.ts`       | Helpers for rendering user names and avatars                                 |
| `lib/product-categories.ts` | Static category list and label lookups                                       |
| `lib/profile-update.ts`     | Profile form submission helpers                                              |

---

## Styling

- **Tailwind CSS 3** — utility-first classes for all layout and styling
- **`tailwind-merge` + `clsx`** — conditional class composition via the `cn()` helper
- **`framer-motion`** — page transitions and micro-animations
- **`lottie-react`** — JSON-based animation playback (lazy-loaded)

Global base styles are in `src/index.css`.

---

## Build & Bundling

**Tool:** Vite 5

- **Development**: Vite dev server at `localhost:5173`, proxies `/api/*` to `localhost:3000` (configured in `vite.config.ts`)
- **Production**: `vite build` emits static assets to `dist/`; all pages are lazy-split into separate JS chunks
- **Type checking**: `tsc --noEmit` runs separately (not blocking the Vite build pipeline)
- **Docker**: The production image serves `dist/` via nginx; `/api` and `/uploads` are reverse-proxied to the backend container

---

## Key Design Decisions

| Decision                                 | Rationale                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| In-memory access token                   | Prevents XSS token theft; refresh token stays in `httpOnly` cookie                                      |
| `useSyncExternalStore` for auth          | No Context provider needed; avoids unnecessary re-renders from context propagation                      |
| Module-level auth singleton              | Simple, predictable, zero dependency on React render cycle for token management                         |
| Single Axios instance with interceptors  | Centralizes auth attachment and retry logic; all API modules share one configuration                    |
| `React.lazy()` for all pages             | Keeps initial bundle small; each route chunk loads on demand                                            |
| No global state library                  | Auth state is the only cross-cutting state; a custom store is sufficient without Redux/Zustand overhead |
| Zod schemas from `@campus-market/shared` | Enforces identical data shapes between frontend and backend at compile time                             |
