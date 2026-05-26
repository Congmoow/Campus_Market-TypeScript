# Campus Market — Backend

> A REST API service for the campus second-hand trading platform, built with Node.js + Express + TypeScript + Prisma ORM + PostgreSQL.

**Language:** [简体中文](./README-zh-CN.md) | English

Back to root: [README.md](../README.md)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Development Commands](#development-commands)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Docker](#docker)
- [Known Limitations](#known-limitations)

---

## Tech Stack

| Category    | Technologies                                      |
| ----------- | ------------------------------------------------- |
| Runtime     | Node.js 20+                                       |
| Framework   | Express 4                                         |
| Language    | TypeScript 5                                      |
| ORM         | Prisma 6 (`@prisma/adapter-pg`)                   |
| Database    | PostgreSQL 13+                                    |
| Auth        | JWT (`jsonwebtoken`), Cookie                      |
| Password    | bcrypt                                            |
| File Upload | Multer                                            |
| Validation  | Zod (shared contract layer)                       |
| CORS        | cors                                              |
| Config      | dotenv                                            |
| Testing     | Jest 29, Supertest, ts-jest                       |
| Shared      | `@campus-market/shared` (Zod schemas + DTO types) |

---

## Directory Structure

```text
backend/
├─ src/
│  ├─ __tests__/         # Integration tests (*.integration.test.ts)
│  ├─ app.ts             # Express app setup (middleware, routes)
│  ├─ server.ts          # HTTP server entry point
│  ├─ config/            # Config loaders (DB, env vars)
│  ├─ constants/         # Constant definitions
│  ├─ controllers/       # Route controllers (request/response layer)
│  ├─ mappers/           # Data mappers (DB entity → DTO)
│  ├─ middlewares/       # Middleware (auth, error handling, upload, etc.)
│  ├─ prisma/            # Prisma client instance
│  ├─ routes/            # Route definitions (with route-level tests)
│  ├─ scripts/           # Ops scripts (Docker DB init, etc.)
│  ├─ services/          # Business logic layer
│  ├─ types/             # TypeScript type extensions
│  ├─ utils/             # Utility functions
│  └─ validation/        # Request parameter validation
├─ prisma/
│  ├─ schema.prisma      # Database schema definition
│  ├─ migrations/        # Prisma migration history
│  ├─ seed.ts            # Database seed script
│  └─ bootstrap-current-schema.sql  # Baseline SQL for empty Docker DB
├─ scripts/              # Shell scripts (docker-entrypoint, etc.)
├─ Dockerfile            # Multi-stage build image
├─ docker-entrypoint.sh  # Container startup script (migrate + seed + start)
├─ jest.config.js        # Jest configuration
├─ tsconfig.json         # TypeScript configuration
└─ package.json
```

---

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

| Variable                        | Required | Description                                                                              |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | ✅       | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/campus_market` |
| `JWT_SECRET`                    | ✅       | JWT signing secret; use a long random string in production                               |
| `FRONTEND_URL`                  | ✅       | Frontend origin for CORS, e.g. `http://localhost:5173`                                   |
| `PORT`                          | No       | Listening port, default `3000`                                                           |
| `NODE_ENV`                      | No       | `development` / `production` / `test`                                                    |
| `AUTH_COOKIE_SECURE`            | No       | `true` (HTTPS) / `false` (HTTP), default `false`                                         |
| `PRISMA_ALLOW_DB_PUSH_FALLBACK` | No       | Allow `prisma db push` fallback on Docker startup, default `false`                       |

---

## Database

### Setup (Local Development)

```bash
# Apply all migrations and generate Prisma Client
npm run prisma:deploy
npm run prisma:generate

# Create a new migration after editing the schema
npm run prisma:migrate

# Force-push schema (skip migrations; use for test environments)
npm run test:prepare-db
```

### Prisma Studio (Visual DB Management)

```bash
npm run prisma:studio
```

### Seed Data

```bash
npm run prisma:seed
```

The seed script inserts default product categories and is safe to run multiple times (idempotent).

---

## Development Commands

Run inside `backend/` (or use `--workspace` from the monorepo root):

```bash
# Start dev server (ts-node-dev with hot reload)
npm run dev

# TypeScript type checking
npm run typecheck

# ESLint static analysis
npm run lint

# Compile TypeScript
npm run build

# Start the compiled server (production)
npm start
```

Local dev URL: `http://localhost:3000`  
Health check: `http://localhost:3000/health`

---

## API Overview

All endpoints are prefixed with `/api`.

| Prefix            | Module     | Description                                           |
| ----------------- | ---------- | ----------------------------------------------------- |
| `/api/auth`       | Auth       | Register, login, logout, current user                 |
| `/api/products`   | Products   | List, detail, publish, edit, delete                   |
| `/api/orders`     | Orders     | Create, list, detail, status update                   |
| `/api/users`      | Users      | Profile info, avatar upload                           |
| `/api/categories` | Categories | Category list                                         |
| `/api/uploads`    | Files      | Product image upload                                  |
| `/api/admin`      | Admin      | User/product/order management (requires `ADMIN` role) |
| `/health`         | Health     | Service liveness probe                                |

---

## Testing

### Run Tests

```bash
# Single run
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# CI mode (coverage report + JUnit XML)
npm run test:ci

# Prepare test database (push schema only, no migration)
npm run test:prepare-db
```

### Test Coverage

| Directory                             | What's Tested                                |
| ------------------------------------- | -------------------------------------------- |
| `src/services/__tests__/`             | Business logic unit tests                    |
| `src/controllers/__tests__/`          | Controller behavior                          |
| `src/middlewares/__tests__/`          | Middleware logic                             |
| `src/config/__tests__/`               | Config loading                               |
| `src/routes/__tests__/`               | Route layer (request/response validation)    |
| `src/__tests__/*.integration.test.ts` | Integration tests (requires real PostgreSQL) |

### Coverage Thresholds

- Statements / Lines / Functions: ≥ 80%
- Branches: ≥ 70%
- Scope: auth, products, validation, mappers, and other core modules

### Report Artifacts

| Artifact      | Path                                      |
| ------------- | ----------------------------------------- |
| Coverage HTML | `backend/coverage/index.html`             |
| LCOV          | `backend/coverage/lcov.info`              |
| Cobertura XML | `backend/coverage/cobertura-coverage.xml` |
| JUnit XML     | `backend/reports/junit.xml`               |

---

## Docker

### Image Build

The backend Dockerfile uses a multi-stage build:

1. **deps stage** — installs all dependencies (including devDependencies)
2. **builder stage** — compiles `@campus-market/shared`, generates Prisma Client, compiles TypeScript
3. **runner stage** — installs production dependencies only, copies build artifacts and Prisma schema

### Startup Flow (`docker-entrypoint.sh`)

1. Wait for PostgreSQL to become healthy
2. Run `bootstrap-current-schema.sql` (baseline schema for empty database)
3. Normalize legacy Prisma migration metadata
4. Run `prisma migrate deploy`
5. If previous steps fail and `PRISMA_ALLOW_DB_PUSH_FALLBACK=true`, fall back to `prisma db push`
6. Run product category seed script
7. Start `node dist/server.js`

### Run via Root Compose

```bash
docker compose up --build -d
docker compose logs -f backend
```

### Manually Re-run Migrations

```bash
docker compose exec backend npm exec --workspace campus-market-backend prisma migrate deploy --schema backend/prisma/schema.prisma
```

---

## Known Limitations

- `order.service.ts` intentionally retains defensive fallback validation as a service-layer safety measure
- `admin.service.ts#getAllOrders` `keyword` field remains a no-op from historical implementation
- Legacy Prisma migrations cannot be replayed cleanly from an empty database; startup depends on `bootstrap-current-schema.sql`
- After modifying the Prisma schema, `prisma/bootstrap-current-schema.sql` and the migration compatibility logic in `src/scripts/docker-db-init.ts` must be updated accordingly
- Integration tests require an available PostgreSQL test database; run `test:prepare-db` before executing them in CI or locally
