# Backend Architecture

> Campus Market Backend — Node.js + Express + TypeScript + Prisma

---

## Table of Contents

- [Overview](#overview)
- [Layer Diagram](#layer-diagram)
- [Entry & Startup](#entry--startup)
- [Middleware Pipeline](#middleware-pipeline)
- [Routing Layer](#routing-layer)
- [Controller Layer](#controller-layer)
- [Service Layer](#service-layer)
- [Data Access — Prisma](#data-access--prisma)
- [Mappers](#mappers)
- [Authentication & Authorization](#authentication--authorization)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [File Uploads](#file-uploads)
- [Utilities](#utilities)
- [Config](#config)
- [Key Design Decisions](#key-design-decisions)

---

## Overview

The backend is a classic layered REST API:

```
HTTP Request → Middleware → Router → Controller → Service → Prisma → PostgreSQL
                                                         ↓
                                                      Mapper → DTO → JSON Response
```

TypeScript is used end-to-end. Shared Zod schemas from `@campus-market/shared` validate request payloads and type API responses consumed by the frontend.

---

## Layer Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     HTTP Clients                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│               Express Middleware Pipeline                     │
│  cors → json parser → urlencoded → /uploads static serve     │
│  /health endpoint                                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                   Route Handlers  (routes/)                   │
│  auth · products · categories · users · orders               │
│  chat · favorites · upload · admin                           │
│  Per-route middleware: authenticate | optionalAuthenticate   │
│                        requireAdmin | upload                 │
│                        validateRequest (Zod)                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                 Controllers  (controllers/)                   │
│  Parse req → call service → format response → send           │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  Services  (services/)                        │
│  Business logic, validation rules, cross-entity operations   │
│  Throws BusinessException subtypes on errors                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│               Prisma ORM  (prisma/)                           │
│  schema.prisma → generated Client  (@prisma/adapter-pg)      │
│  PostgreSQL 13+                                              │
└──────────────────────────────────────────────────────────────┘
         │
         ▼  (on reads)
┌──────────────────┐
│  Mappers         │  DB entity → DTO
│  (mappers/)      │  Decouples DB shape from API contract
└──────────────────┘
```

---

## Entry & Startup

```
src/server.ts       Creates HTTP server, binds port (default 3000)
  └─ src/app.ts     Builds and exports the Express Application
       ├─ dotenv.config()
       ├─ getJwtConfig()        validates JWT env vars on startup
       ├─ Middleware registration
       ├─ Route registration
       ├─ notFoundHandler       (404 fallback)
       └─ errorHandler          (global error catch)
```

`server.ts` is the process entry point. `app.ts` exports the `Application` instance so it can be imported cleanly in tests without binding a port.

---

## Middleware Pipeline

Middleware is registered in `app.ts` in the following order:

| Order | Middleware                                | Purpose                                                         |
| ----- | ----------------------------------------- | --------------------------------------------------------------- |
| 1     | `cors(buildCorsOptions())`                | Allow requests from `FRONTEND_URL` origins; `credentials: true` |
| 2     | `express.json()`                          | Parse JSON request bodies                                       |
| 3     | `express.urlencoded({ extended: true })`  | Parse URL-encoded bodies                                        |
| 4     | `express.static(uploadDir)` at `/uploads` | Serve uploaded files                                            |
| 5     | `GET /health`                             | Liveness probe (`{ status: 'ok' }`)                             |
| 6     | Route handlers                            | Business logic (see [Routing Layer](#routing-layer))            |
| 7     | `notFoundHandler`                         | 404 for unmatched paths                                         |
| 8     | `errorHandler`                            | Centralized error serialization                                 |

**CORS:** `getAllowedOrigins()` reads `FRONTEND_URL` (comma-separated list). In non-production environments, `localhost:5173` is allowed as a fallback. Any other origin receives a 403.

---

## Routing Layer

**Directory:** `src/routes/`

Each route file maps HTTP verbs and paths to controller methods, inserting per-route middleware inline.

| File                 | Mount point       | Key middleware applied                                              |
| -------------------- | ----------------- | ------------------------------------------------------------------- |
| `auth.routes.ts`     | `/api/auth`       | — (public)                                                          |
| `product.routes.ts`  | `/api/products`   | `authenticate`, `optionalAuthenticate`, `upload`, `validateRequest` |
| `category.routes.ts` | `/api/categories` | — (public)                                                          |
| `user.routes.ts`     | `/api/users`      | `authenticate`, `upload`                                            |
| `order.routes.ts`    | `/api/orders`     | `authenticate`, `validateRequest`                                   |
| `chat.routes.ts`     | `/api/chat`       | `authenticate`                                                      |
| `favorite.routes.ts` | `/api/favorites`  | `authenticate`                                                      |
| `upload.routes.ts`   | `/api/upload`     | `authenticate`, `upload`                                            |
| `admin.routes.ts`    | `/api/admin`      | `authenticate`, `requireAdmin`                                      |

---

## Controller Layer

**Directory:** `src/controllers/`

Controllers are thin request/response handlers. Each method:

1. Extracts data from `req.params`, `req.query`, `req.body`, `req.user`, and `req.file`
2. Delegates to one or more service calls
3. Sends the formatted response (using `response.util` helpers)

Controllers do **not** contain business logic and do **not** access Prisma directly.

| Controller               | Handles                                |
| ------------------------ | -------------------------------------- |
| `auth.controller.ts`     | register, login, logout, refresh, me   |
| `product.controller.ts`  | CRUD for products, search, pagination  |
| `order.controller.ts`    | create order, list, status transitions |
| `user.controller.ts`     | profile read/update, avatar upload     |
| `chat.controller.ts`     | message threads and history            |
| `favorite.controller.ts` | toggle and list favorites              |
| `file.controller.ts`     | image upload and URL resolution        |
| `admin.controller.ts`    | admin views and bulk operations        |

---

## Service Layer

**Directory:** `src/services/`

All business logic lives in services. Services:

- Use the Prisma client directly for data access
- Throw `BusinessException` subtypes (`NotFoundException`, `UnauthorizedException`, `ForbiddenException`, `ValidationException`) — never raw `Error`
- Return plain objects or arrays (DTO-shaped data after mapping)

| Service                       | Responsibility                                         |
| ----------------------------- | ------------------------------------------------------ |
| `auth.service.ts`             | Registration, login, JWT issue, refresh token rotation |
| `product.service.ts`          | Product facade (delegates to command/query)            |
| `product-command.service.ts`  | Create, update, delete product                         |
| `product-query.service.ts`    | List, filter, search, paginate products                |
| `product-category.service.ts` | Category CRUD                                          |
| `order.service.ts`            | Order creation, state machine, validation              |
| `user.service.ts`             | Profile queries and updates                            |
| `chat.service.ts`             | Message persistence and thread queries                 |
| `favorite.service.ts`         | Favorite toggle and queries                            |
| `file.service.ts`             | File storage path resolution                           |
| `admin.service.ts`            | Admin overviews (users, products, orders)              |

**Product service split:** The product domain is intentionally separated into command (`product-command.service.ts`) and query (`product-query.service.ts`) services, following CQRS-lite, to keep each file focused.

---

## Data Access — Prisma

**Directory:** `src/prisma/`, schema at `prisma/schema.prisma`

A single shared `PrismaClient` instance is created in `src/prisma/` and exported for use in services. Using `@prisma/adapter-pg` allows direct use of the `pg` connection pool, compatible with environments like Neon.

**Core models:**

| Model       | Key relations                                                              |
| ----------- | -------------------------------------------------------------------------- |
| `User`      | has many Products, Orders (buyer), Orders (seller), Favorites, Messages    |
| `Product`   | belongs to User (seller), Category; has many OrderItems, Favorites, Images |
| `Category`  | has many Products                                                          |
| `Order`     | belongs to User (buyer) and User (seller); has many OrderItems             |
| `OrderItem` | belongs to Order and Product                                               |
| `Message`   | belongs to sender User and receiver User; linked to Product                |
| `Favorite`  | join table between User and Product                                        |

**Migrations:** Managed via `prisma migrate`. See `prisma/migrations/` for the migration history.

---

## Mappers

**Directory:** `src/mappers/` and `src/services/product.mapper.ts`

Mappers convert Prisma query results into the DTO shapes defined in `@campus-market/shared`. This decouples the database schema from the API contract — renaming a DB column requires updating only the mapper, not every controller or service.

---

## Authentication & Authorization

**Two-token strategy:**

| Token         | Type                         | Storage           | Lifetime             |
| ------------- | ---------------------------- | ----------------- | -------------------- |
| Access token  | JWT (signed)                 | Client in-memory  | Short (e.g., 15 min) |
| Refresh token | Opaque string (hashed in DB) | `httpOnly` cookie | Long (e.g., 7 days)  |

**Middleware chain for protected routes:**

```
authenticate       →  verifyToken(Bearer header)  →  req.user = AuthTokenPayload
requireAdmin       →  req.user.role === 'ADMIN'   →  else 401
optionalAuthenticate → same as authenticate but continues on failure
```

**Token refresh flow:**

```
POST /api/auth/refresh
  ├─ read refreshToken cookie
  ├─ verify + look up hashed token in DB
  ├─ rotate: delete old, issue new refresh token (cookie) + new access token
  └─ return { token: <new access token> }
```

**Cookie configuration** (`auth-cookie.util.ts`):

| Option     | Value                                                    |
| ---------- | -------------------------------------------------------- |
| `httpOnly` | `true`                                                   |
| `secure`   | `true` in production / `AUTH_COOKIE_SECURE` env override |
| `sameSite` | `lax` (default) / `AUTH_COOKIE_SAME_SITE` override       |
| `path`     | `/api/auth` (limits cookie scope)                        |

---

## Error Handling

**File:** `src/middlewares/error.middleware.ts`

All services throw subclasses of `BusinessException`:

| Exception                  | HTTP status                |
| -------------------------- | -------------------------- |
| `ValidationException`      | 400                        |
| `UnauthorizedException`    | 401                        |
| `ForbiddenException`       | 403                        |
| `NotFoundException`        | 404                        |
| `BusinessException` (base) | configurable (default 400) |

The `errorHandler` middleware catches these and serializes them to:

```json
{ "success": false, "message": "...", "statusCode": 400 }
```

Unknown errors return `500` with the message hidden in production. `notFoundHandler` catches all unmatched routes and returns `404`.

---

## Validation

**File:** `src/middlewares/validation.middleware.ts`

Routes opt in to request validation by composing `validateRequest(schema)` middleware. The schema is a Zod object imported from `@campus-market/shared`. On failure, the middleware throws a `ValidationException` with the first Zod error message.

---

## File Uploads

**Files:** `src/middlewares/upload.middleware.ts`, `src/services/file.service.ts`, `src/utils/upload.config.ts`

- **Engine:** Multer with disk storage
- **Storage path:** `uploads/` (configurable via `UPLOAD_DIR` env var; mounted as a Docker named volume)
- **Allowed types:** Configurable MIME type allowlist (images only)
- **URL resolution:** `file.service.ts` converts stored filenames to accessible `/uploads/<filename>` URLs

---

## Utilities

| File                    | Purpose                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `error.util.ts`         | `BusinessException` hierarchy                                                            |
| `jwt.util.ts`           | `signToken()` / `verifyToken()` wrappers                                                 |
| `auth-cookie.util.ts`   | `setRefreshTokenCookie()` / `clearRefreshTokenCookie()` / `getRefreshTokenFromRequest()` |
| `password.util.ts`      | `hashPassword()` / `comparePassword()` (bcrypt)                                          |
| `response.util.ts`      | `successResponse()` / `errorResponse()` builders                                         |
| `prisma.util.ts`        | Prisma error helpers (unique constraint detection, etc.)                                 |
| `refresh-token.util.ts` | Generate and hash refresh tokens                                                         |
| `duration.util.ts`      | Parse duration strings (e.g., `"7d"`) to milliseconds                                    |

---

## Config

**Directory:** `src/config/`

| File               | Responsibility                                                                         |
| ------------------ | -------------------------------------------------------------------------------------- |
| `jwt.config.ts`    | Reads `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`; validates on startup |
| `upload.config.ts` | Resolves upload directory path and file size limits                                    |

Config modules validate their env vars eagerly (at app startup) and throw descriptive errors when required values are missing, preventing silent misconfiguration.

---

## Key Design Decisions

| Decision                                                     | Rationale                                                                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Layered architecture (Route → Controller → Service → Prisma) | Clear separation of concerns; services are testable without HTTP                                                      |
| `BusinessException` hierarchy                                | Centralizes HTTP status mapping; controllers and services throw typed errors instead of manually setting status codes |
| Two-token auth (JWT + httpOnly refresh cookie)               | Access token is short-lived (limits breach window); refresh token is invisible to JS (mitigates XSS)                  |
| Refresh token rotation                                       | Each use of the refresh token issues a new one and invalidates the old, limiting replay attack windows                |
| Single Prisma client instance                                | Avoids connection pool exhaustion; Prisma manages the underlying pool                                                 |
| CQRS-lite product service split                              | Product queries and mutations have different complexity and caching needs; separating them keeps each file focused    |
| Mapper layer                                                 | Decouples DB schema from API contract; Prisma model renames don't cascade into controllers                            |
| Zod validation middleware                                    | Keeps validation declarative and co-located with the route; errors are consistently typed                             |
| `app.ts` exports the Application                             | Allows test suites to import the app without binding a port, enabling `supertest` integration tests                   |
