# syntax=docker/dockerfile:1.7
# InScene: Next.js standalone server for Google Cloud Run.

ARG NODE_VERSION=20

# ---- deps: install node_modules from the lockfile ---------------------------------
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- build: compile the standalone server (seed.ts is compiled into the bundle) ---
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: slim image with ffmpeg/ffprobe for segment export ---------------------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/app/data

# Standalone server + static assets + public media (canonical film, fallback clips).
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Runtime-writable locations: generated cuts / audio ads / brand uploads, and the JSON store.
RUN mkdir -p /app/public/media/generated /app/public/media/audio /app/public/media/brands /app/data \
  && chown -R node:node /app/public/media /app/data

USER node
EXPOSE 8080
CMD ["node", "server.js"]
