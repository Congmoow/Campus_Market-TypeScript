FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --ignore-scripts

COPY frontend ./frontend
COPY packages/shared ./packages/shared

RUN npm run build:shared \
  && npm --workspace campus-market-frontend run build

FROM nginx:1.27-alpine AS runner

COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
