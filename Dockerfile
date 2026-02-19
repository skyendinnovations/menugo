FROM oven/bun:latest
WORKDIR /app

# Copy root workspace files and strip mobile from workspaces
COPY package.json bun.lock turbo.json tsconfig.base.json ./
RUN sed -i 's|"apps/\*"|"apps/backend"|' package.json

# Copy workspace package manifests
COPY apps/backend/package.json apps/backend/package.json
COPY packages/dto/package.json packages/dto/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/data/package.json packages/data/package.json
COPY packages/email/package.json packages/email/package.json
COPY packages/storage/package.json packages/storage/package.json

# Install deps (single stage so bun symlinks stay intact)
RUN bun install --no-save

# Copy workspace packages source
COPY packages/ ./packages/

# Copy backend source
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/index.ts apps/backend/auth.ts apps/backend/tsconfig.json ./apps/backend/

WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["bun", "run", "index.ts"]
