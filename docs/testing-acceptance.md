# Testing & Acceptance Guide

> Detailed breakdown of the three-layer test suite, acceptance commands, report locations, and CI/Gitee Go configuration.

Back to README: [README.md](../README.md) | [README-zh-CN.md](../README-zh-CN.md)

---

## Three-Layer Test Architecture

### Layer 1 — Unit / Component Tests

| Side     | Tool                       | Key directories                                                                                            |
| -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Backend  | Jest 29 + ts-jest          | `backend/src/services/__tests__/`, `controllers/__tests__/`, `middlewares/__tests__/`, `config/__tests__/` |
| Frontend | Vitest 1 + Testing Library | `frontend/src/components/__tests__/`, `pages/__tests__/`, `lib/__tests__/`, `api/__tests__/`               |

Goal: catch regressions in pure functions, service logic, component rendering, and user interactions early.

### Layer 2 — Integration / Contract Tests

| Tool             | Key directories                                                                |
| ---------------- | ------------------------------------------------------------------------------ |
| Jest + Supertest | `backend/src/__tests__/*.integration.test.ts`, `backend/src/routes/__tests__/` |

Requires a live PostgreSQL test database. Push the schema before running:

```bash
npm --workspace campus-market-backend run test:prepare-db
```

Goal: verify HTTP status codes, response shapes, authentication, database reads/writes, and shared contract integrity.

### Layer 3 — Docker API Regression

Entry point: `scripts/docker-acceptance.mjs`  
Root command: `npm run test:acceptance`

Spins up `postgres + backend + frontend` via Docker Compose, then issues HTTP requests from the client side to validate:

- `/api` proxy routing through nginx
- Authentication (register, login, token refresh)
- Product creation, file upload
- Order creation and status transitions
- Data persistence across container restarts

Goal: verify that the containerized delivery can actually be called by a real client — not pixel-level browser testing.

---

## Local Full Acceptance Flow

Run in the repository root in order:

```bash
npm ci
npm run lint
npm run typecheck
npm --workspace campus-market-backend run test:prepare-db
npm run test:code
npm run build
docker compose --env-file .env.docker.example up --build -d
npm run test:acceptance
docker compose --env-file .env.docker.example down -v --remove-orphans
```

### Per-layer commands

```bash
# Layer 1 — unit/component coverage
npm run test:coverage:backend
npm run test:coverage:frontend

# Layer 2 — integration/contract
npm --workspace campus-market-backend run test:prepare-db
npm --workspace campus-market-backend run test:ci

# Layer 3 — Docker API regression
npm run test:acceptance
```

### Notes on composite commands

| Command                                              | What it does                                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run test:code`                                  | Runs `test:acceptance-report` + `test:coverage:backend` + `test:coverage:frontend` |
| `npm run test:acceptance-report`                     | Validates acceptance report helper success/failure paths                           |
| `npm --workspace campus-market-backend run test:ci`  | Backend coverage + JUnit reporter (suitable for CI artifact archiving)             |
| `npm --workspace campus-market-frontend run test:ci` | Frontend coverage + JUnit XML via Vitest                                           |

---

## Coverage Thresholds

Applies to core business modules (auth, products, validation, mappers, entry points, key components):

| Metric     | Threshold |
| ---------- | --------- |
| Statements | ≥ 80%     |
| Lines      | ≥ 80%     |
| Functions  | ≥ 80%     |
| Branches   | ≥ 70%     |

---

## Report Artifacts

| Artifact                  | Path                                                                        |
| ------------------------- | --------------------------------------------------------------------------- |
| Backend coverage HTML     | `backend/coverage/index.html`                                               |
| Backend LCOV              | `backend/coverage/lcov.info`                                                |
| Backend Cobertura XML     | `backend/coverage/cobertura-coverage.xml`                                   |
| Backend JUnit XML         | `reports/backend/junit.xml`                                                 |
| Frontend coverage HTML    | `frontend/coverage/index.html`                                              |
| Frontend LCOV             | `frontend/coverage/lcov.info`                                               |
| Frontend Cobertura XML    | `frontend/coverage/cobertura-coverage.xml`                                  |
| Frontend JUnit XML        | `frontend/reports/frontend-junit.xml`                                       |
| Docker acceptance JSON    | `reports/acceptance-report.json`                                            |
| Docker acceptance summary | `reports/acceptance-summary.md`                                             |
| Docker logs               | `reports/docker/compose.log`, `postgres.log`, `backend.log`, `frontend.log` |

---

## GitHub Actions CI

Config: `.github/workflows/ci.yml`

| Job                   | Trigger                         | Steps                                                                                  |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `code-level-tests`    | push / PR                       | lint → typecheck → `test:code` → build; uploads `reports/backend`, `reports/frontend`  |
| `customer-regression` | after `code-level-tests` passes | Docker Compose full-stack regression; uploads `reports/acceptance*`, `reports/docker*` |

---

## Gitee Go Pipelines

| File                              | Description                                            |
| --------------------------------- | ------------------------------------------------------ |
| `.workflow/quality-gate.yml`      | Code-level quality gate (lint, typecheck, test, build) |
| `.workflow/docker-regression.yml` | Quality gate → Docker client-side regression           |

Both pipelines upload `./reports` to artifact repository `campus-market-test-reports`.

**Required manual steps in the Gitee web UI (not automatable from repo config):**

1. Create the `campus-market-test-reports` artifact repository in Gitee Go, or update `artifactRepository` in the YAML files to match an existing repo
2. Enable pipelines after committing the workflow files
3. Configure branch protection on `main`: require PR, set pipeline status as merge prerequisite

### Docker runner prerequisites

- Docker Engine installed with `docker compose` subcommand available
- Port `80`, `3000`, `5432` free on the runner
- Node.js 20+ (for `fetch`, `File`, `FormData`, `AbortSignal.timeout` in the acceptance script)
- Access to `.env.docker.example` in the repo root
- Prefer self-hosted Docker runner on Gitee Go; shared runners without a Docker daemon will fail Layer 3 tests

### Known limitations

- Docker API regression covers HTTP delivery chain only; no browser visual regression, DOM interactions, or performance metrics
- The script assumes fixed local ports and the default compose project name — not suitable for parallel runs on the same machine
- Test data (accounts, products, orders, uploads) persists in test volumes unless `docker compose down -v` is run
- Local Docker acceptance relies on `AUTH_COOKIE_SECURE=false` (HTTP); not equivalent to production HTTPS
