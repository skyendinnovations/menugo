FROM oven/bun:latest AS base
WORKDIR /app

# --- Install stage ---
FROM base AS install

# Copy root workspace files and strip mobile from workspaces
COPY package.json bun.lock turbo.json ./
RUN sed -i 's|"apps/\*"|"apps/backend"|' package.json

# Copy workspace package manifests
COPY apps/backend/package.json apps/backend/package.json
COPY packages/dto/package.json packages/dto/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/data/package.json packages/data/package.json
COPY packages/email/package.json packages/email/package.json
COPY packages/storage/package.json packages/storage/package.json

RUN bun install --no-save

# --- Production stage ---
FROM base

# Copy installed deps
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/apps/backend/node_modules ./apps/backend/node_modules

# Symlink backend deps to root so workspace packages can resolve them
RUN mkdir -p /app/node_modules && \
    for pkg in /app/apps/backend/node_modules/*; do \
      name=$(basename "$pkg"); \
      [ ! -e "/app/node_modules/$name" ] && ln -s "$pkg" "/app/node_modules/$name"; \
    done; \
    for pkg in /app/apps/backend/node_modules/@*/*; do \
      scope=$(basename "$(dirname "$pkg")"); \
      name=$(basename "$pkg"); \
      mkdir -p "/app/node_modules/$scope"; \
      [ ! -e "/app/node_modules/$scope/$name" ] && ln -s "$pkg" "/app/node_modules/$scope/$name"; \
    done; true

# Copy root config
COPY package.json turbo.json tsconfig.base.json ./

# Copy workspace packages source
COPY packages/ ./packages/

# Copy backend source
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/index.ts apps/backend/auth.ts apps/backend/tsconfig.json ./apps/backend/

WORKDIR /app/apps/backend

ENV NODE_ENV=production

# Cloud Run injects PORT env var (default 8080)
EXPOSE 5000

CMD ["bun", "run", "index.ts"]
