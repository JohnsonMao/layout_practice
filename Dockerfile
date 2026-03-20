# Stage 1: Base image
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Builder - Install dependencies and build
FROM base AS builder
WORKDIR /app

# Copy package management files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy the rest of the source code
# Note: .dockerignore excludes node_modules, dist, etc.
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the relay-service
# This runs 'tsup' which bundles workspace dependencies into apps/relay-service/dist/index.js
RUN pnpm --filter=relay-service build

# Deploy the built application to a separate directory with only production dependencies
# "deploy" command uses "npm pack" mechanism, so it respects "files" in package.json (which includes "dist")
# pnpm v10+ requires --legacy for non-injected workspace dependencies during deploy
RUN pnpm --filter=relay-service --prod deploy --legacy /prod/relay-service

# Stage 3: Runner - Production image
FROM base AS runner
WORKDIR /app

# Create a non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 relay

# Copy the deployed application from builder
COPY --from=builder --chown=relay:nodejs /prod/relay-service /app

# Set ownership and switch to non-root user
USER relay

# Expose port if needed (Relay service might not bind a port if it's purely a worker/bot)
# EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
