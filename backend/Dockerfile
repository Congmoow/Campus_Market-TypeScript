FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV NODE_ENV=development

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN set -eux; \
  for attempt in 1 2 3; do \
    npm ci --ignore-scripts --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 && break; \
    if [ "${attempt}" -eq 3 ]; then \
      exit 1; \
    fi; \
    echo "npm ci failed, retrying (${attempt}/3)..." >&2; \
    sleep 5; \
  done

COPY backend ./backend
COPY packages/shared ./packages/shared

RUN npm rebuild bcrypt --workspace campus-market-backend \
  && npm run build:shared \
  && npm --workspace campus-market-backend run prisma:generate \
  && npm --workspace campus-market-backend run build

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

RUN chmod +x /app/backend/docker-entrypoint.sh \
  && mkdir -p /app/uploads/avatars /app/uploads/products /app/uploads/chat

EXPOSE 3000

ENTRYPOINT ["/app/backend/docker-entrypoint.sh"]
