# Docker Deployment Guide

> Full Docker Compose setup, environment variable reference, database initialization mechanism, and production checklist.

Back to README: [README.md](../README.md) | [README-zh-CN.md](../README-zh-CN.md)

---

## Docker Files

| File                           | Purpose                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| `docker-compose.yml`           | Orchestrates `postgres`, `backend`, and `frontend` services             |
| `.env.docker.example`          | Environment variable template for Docker deployment                     |
| `backend/Dockerfile`           | Multi-stage build for the Node.js API server                            |
| `backend/docker-entrypoint.sh` | Container startup script (migrate → seed → start)                       |
| `frontend/Dockerfile`          | Multi-stage build for the React SPA                                     |
| `frontend/nginx/default.conf`  | nginx config: static file serving + `/api` and `/uploads` reverse proxy |

---

## First-Time Setup

### 1. Copy the environment template

```bash
cp .env.docker.example .env
```

### 2. Edit `.env`

| Variable                        | Required | Description                                                                     |
| ------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `POSTGRES_DB`                   | ✅       | Database name                                                                   |
| `POSTGRES_USER`                 | ✅       | Database user                                                                   |
| `POSTGRES_PASSWORD`             | ✅       | Database password — **must change in production**                               |
| `DATABASE_URL`                  | ✅       | Full connection string; host must be `postgres` inside the compose network      |
| `JWT_SECRET`                    | ✅       | JWT signing secret — **must change in production**                              |
| `FRONTEND_URL`                  | ✅       | Frontend origin for CORS (e.g., `http://localhost` or `https://yourdomain.com`) |
| `VITE_API_URL`                  | ✅       | Recommended: `/api` (proxied by nginx)                                          |
| `AUTH_COOKIE_SECURE`            | No       | `false` for local HTTP; `true` for production HTTPS                             |
| `PRISMA_ALLOW_DB_PUSH_FALLBACK` | No       | `true` to allow `prisma db push` as last-resort fallback; default `false`       |

### 3. Build and start

```bash
docker compose up --build -d
```

### 4. Verify

| Service      | URL                          |
| ------------ | ---------------------------- |
| Frontend     | http://localhost             |
| Backend API  | http://localhost:3000        |
| Health check | http://localhost:3000/health |
| PostgreSQL   | localhost:5432               |

---

## Common Commands

```bash
# Stream all logs
docker compose logs -f

# Stream logs for a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Stop all services (data preserved)
docker compose down

# Stop and remove all volumes (WARNING: database data will be lost)
docker compose down -v

# Restart a single service
docker compose restart backend
```

---

## Database Initialization Mechanism

On every backend container startup, `docker-entrypoint.sh` runs the following steps in order:

1. **Wait for PostgreSQL** — polls until the database is healthy
2. **Baseline schema** — runs `backend/prisma/bootstrap-current-schema.sql` to create all tables on an empty database (idempotent)
3. **Migration metadata normalization** — marks all existing legacy Prisma migrations as already applied in the `_prisma_migrations` table
4. **`prisma migrate deploy`** — applies any new migrations on top of the baseline
5. **Fallback** — if the above fails and `PRISMA_ALLOW_DB_PUSH_FALLBACK=true`, falls back to `prisma db push --skip-generate` as a last resort
6. **Category seed** — seeds default product categories (idempotent)
7. **Start server** — `node dist/server.js`

> **Note:** The historical Prisma migration directory is not a clean replay chain from an empty database. The bootstrap SQL file is required for the first startup. If you modify the Prisma schema after deployment, update both `prisma/bootstrap-current-schema.sql` and the migration compatibility logic in `src/scripts/docker-db-init.ts`.

### Manually re-run migrations

```bash
docker compose exec backend npm exec --workspace campus-market-backend prisma migrate deploy --schema backend/prisma/schema.prisma
```

---

## Service Architecture

```
Browser
  │
  ▼
nginx (port 80)
  ├── /* → frontend/dist/ (static files)
  ├── /api/* → backend:3000
  └── /uploads/* → backend:3000
        │
        ▼
   Express API (port 3000)
        │
        ▼
   PostgreSQL (port 5432, internal)
```

- The frontend container only serves static assets and proxies API calls — it does **not** run the Vite dev server in production
- The backend container handles all business logic, file uploads, and database access
- PostgreSQL port `5432` is mapped to the host for local inspection; restrict or remove this mapping in production

---

## Production Checklist

- [ ] Replace all sample passwords and secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`)
- [ ] Set `FRONTEND_URL` to your real domain (e.g., `https://market.example.com`)
- [ ] Set `AUTH_COOKIE_SECURE=true` for HTTPS environments
- [ ] Do **not** expose port `5432` publicly
- [ ] Map the uploads volume to persistent host storage or object storage to survive container rebuilds
- [ ] For TLS, place a cloud load balancer or upstream reverse proxy in front of nginx
- [ ] Keep `VITE_API_URL=/api` to use the same-origin proxy; switching to an external URL requires a full image rebuild

---

## Troubleshooting

| Issue                                           | Solution                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Port conflict (80 / 3000 / 5432)                | Free the port or update host port mappings in `docker-compose.yml`                           |
| Prisma connection failure                       | Confirm `DATABASE_URL` host is `postgres`, not `localhost`                                   |
| Frontend API not working                        | Keep `VITE_API_URL=/api`; changing to an external URL requires rebuilding the frontend image |
| Uploaded files missing after restart            | Ensure `docker compose down -v` was not run; verify the uploads volume is mounted correctly  |
| `prisma migrate deploy` fails on fresh database | This is expected — the entrypoint script handles it via the bootstrap SQL fallback           |
