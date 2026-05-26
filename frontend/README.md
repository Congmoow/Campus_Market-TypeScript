# Campus Market — Frontend

> A React 18 + Vite + TypeScript + Tailwind CSS single-page application for the campus second-hand trading platform.

**Language:** [简体中文](./README-zh-CN.md) | English

Back to root: [README.md](../README.md)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Environment Variables](#environment-variables)
- [Development Commands](#development-commands)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Pages & Features](#pages--features)
- [Docker](#docker)

---

## Tech Stack

| Category  | Technologies                                                |
| --------- | ----------------------------------------------------------- |
| Framework | React 18, React Router v6                                   |
| Build     | Vite 5, TypeScript 5                                        |
| Styling   | Tailwind CSS 3, tailwind-merge, clsx                        |
| HTTP      | Axios                                                       |
| Animation | Framer Motion, Lottie React                                 |
| Charts    | Recharts                                                    |
| Icons     | Lucide React, Icon Park React                               |
| Emoji     | emoji-mart                                                  |
| Slider    | rc-slider                                                   |
| Testing   | Vitest, @testing-library/react, @testing-library/user-event |
| Shared    | `@campus-market/shared` (Zod schemas + DTO types)           |

---

## Directory Structure

```text
frontend/
├─ src/
│  ├─ api/               # Axios request wrappers
│  ├─ assets/            # Static assets (images, animations)
│  ├─ components/        # Reusable UI components
│  ├─ hooks/             # Custom React hooks
│  ├─ lib/               # Utility functions and helpers
│  ├─ pages/             # Route page components
│  ├─ test/              # Test helpers (setup, etc.)
│  ├─ App.tsx            # Root router component
│  ├─ main.tsx           # Application entry point
│  └─ index.css          # Global styles
├─ public/               # Public static files
├─ nginx/
│  └─ default.conf       # nginx config for Docker production
├─ Dockerfile            # Multi-stage build image
├─ vite.config.ts        # Vite config (includes local proxy)
├─ vitest.config.ts      # Vitest test config
├─ tailwind.config.js    # Tailwind theme config
├─ tsconfig.json         # TypeScript config
└─ package.json
```

---

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

| Variable       | Required | Default | Description                                                                       |
| -------------- | -------- | ------- | --------------------------------------------------------------------------------- |
| `VITE_API_URL` | No       | (empty) | Backend API URL; leave empty or at default when using Vite's `/api` proxy locally |

> **Note:** Only variables prefixed with `VITE_` are injected into client code by Vite. Never store server-side secrets in `.env`.

---

## Development Commands

Run inside `frontend/` (or use `--workspace` from the root):

```bash
# Start dev server (hot reload; proxies /api to localhost:3000)
npm run dev

# TypeScript type checking
npm run typecheck

# ESLint static analysis
npm run lint

# Preview the production build
npm run preview
```

From the monorepo root:

```bash
npm --workspace campus-market-frontend run dev
```

Local dev URL: `http://localhost:5173`

---

## Testing

### Run Tests

```bash
# Single run
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage
npm run test:coverage

# CI mode (coverage report + JUnit XML)
npm run test:ci
```

### Test Coverage

| Directory                   | What's Tested                           |
| --------------------------- | --------------------------------------- |
| `src/components/__tests__/` | UI component rendering and interactions |
| `src/pages/__tests__/`      | Page-level integration behavior         |
| `src/lib/__tests__/`        | Utility functions and helpers           |
| `src/api/__tests__/`        | API request functions                   |

### Coverage Thresholds

- Statements / Lines / Functions: ≥ 80%
- Branches: ≥ 70%
- Scope: entry point, product cards, category components, user display utilities

### Report Artifacts

| Artifact      | Path                                       |
| ------------- | ------------------------------------------ |
| Coverage HTML | `frontend/coverage/index.html`             |
| LCOV          | `frontend/coverage/lcov.info`              |
| Cobertura XML | `frontend/coverage/cobertura-coverage.xml` |
| JUnit XML     | `frontend/reports/frontend-junit.xml`      |

---

## Build & Deployment

### Production Build

```bash
npm run build
```

Output goes to `frontend/dist/` as pure static assets, deployable to any static hosting service.

> The `prebuild` hook automatically compiles `@campus-market/shared` before building.

### Preview the Build Locally

```bash
npm run preview
```

---

## Pages & Features

| Route          | Description                                   |
| -------------- | --------------------------------------------- |
| `/`            | Home (product list, category filters, search) |
| `/login`       | User login                                    |
| `/register`    | User registration                             |
| `/product/:id` | Product detail                                |
| `/publish`     | Publish a product (requires login)            |
| `/orders`      | My orders                                     |
| `/profile`     | User profile                                  |
| `/admin`       | Admin panel (requires `ADMIN` role)           |

---

## Docker

The production image uses a multi-stage build:

1. **Build stage** — runs `npm run build` in a Node.js environment to produce static assets
2. **Serve stage** — nginx serves the static files and reverse-proxies `/api` and `/uploads` to the backend

The nginx config is at `nginx/default.conf`; the container exposes port `80`.

Build via the root compose (recommended):

```bash
docker compose up --build -d
```

> Frontend URL: `http://localhost`
