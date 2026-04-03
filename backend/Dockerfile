FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --ignore-scripts

COPY backend ./backend
COPY packages/shared ./packages/shared

RUN npm run build:shared \
  && npm --workspace campus-market-backend run prisma:generate \
  && npm --workspace campus-market-backend run build

FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --omit=dev --ignore-scripts --workspace campus-market-backend --workspace @campus-market/shared

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

RUN chmod +x /app/backend/docker-entrypoint.sh \
  && mkdir -p /app/uploads/avatars /app/uploads/products /app/uploads/chat

EXPOSE 3000

ENTRYPOINT ["/app/backend/docker-entrypoint.sh"]
