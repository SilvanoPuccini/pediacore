# Stage 1: build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY frontend/ .

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_GOOGLE_MAPS_KEY=
ENV VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY

RUN pnpm build

# Stage 2: nginx with frontend build + config
FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=frontend-builder /app/dist /usr/share/nginx/html
