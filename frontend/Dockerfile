FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ENV NODE_ENV=development
ENV VITE_API_URL=${VITE_API_URL}

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
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

COPY frontend ./frontend
COPY packages/shared ./packages/shared

RUN npm run build:shared \
  && npm --workspace campus-market-frontend run build

FROM nginx:1.27-alpine AS runner

COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
