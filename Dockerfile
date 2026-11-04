FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1 npm_config_store_dir=/pnpm/store npm_config_fetch_retries=5 npm_config_network_concurrency=8
RUN npm install --global pnpm@11.10.0

FROM base AS frontend-dev-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

FROM frontend-dev-deps AS frontend-build
COPY frontend/ ./
RUN mkdir -p public && pnpm build

FROM frontend-dev-deps AS frontend-prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm prune --prod

FROM base AS backend-dev-deps
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

FROM backend-dev-deps AS backend-build
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN pnpm build

FROM backend-dev-deps AS backend-prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm prune --prod

FROM backend-dev-deps AS perf
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/perf ./perf
CMD ["pnpm", "perf:load"]

FROM node:24-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 METRICS_PORT=9464 FRONTEND_DIR=/app/frontend NODE_OPTIONS=--max-old-space-size=384
WORKDIR /app
COPY --from=backend-prod-deps /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY backend/package.json ./backend/package.json
COPY --from=frontend-prod-deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-build /app/frontend/.next ./frontend/.next
COPY --from=frontend-build /app/frontend/public ./frontend/public
COPY frontend/package.json frontend/next.config.ts ./frontend/
RUN rm -rf /app/frontend/.next/cache && mkdir -p /app/frontend/.next/cache && chown -R node:node /app/frontend/.next/cache
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 CMD wget -q --spider http://127.0.0.1:3000/readyz
CMD ["node", "backend/dist/main/server.js"]
