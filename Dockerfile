# syntax=docker/dockerfile:1
# Build context is the monorepo root (E:\damage-report), so paths are apps/web/...
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo

# Copy workspace manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json

# Install the web project's dependencies (incl. dev deps needed to build).
RUN pnpm install --frozen-lockfile --filter @e2o/web...

# Copy sources.
COPY apps/web ./apps/web

# Browser-facing API base URL. Baked into the client bundle at build time, so
# it must be the URL the browser uses to reach nginx (NOT the internal name).
ARG NEXT_PUBLIC_API_URL=http://localhost
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @e2o/web run build

# ---- Runtime image ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Next.js "standalone" output: a minimal server + only the traced dependencies.
# outputFileTracingRoot is the monorepo root, so the tree is nested under apps/web.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
