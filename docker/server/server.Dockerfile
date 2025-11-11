ARG NODE_VERSION=22-alpine

#==============================================================================
# IMPORTANT: Development & Testing Strategy
#==============================================================================
# This Dockerfile is for PRODUCTION builds only.
#
# Development:
#   - Run on host machine: pnpm dev
#   - Hot reload with tsx watch
#   - Direct access to source code
#   - Services run in Docker: postgres, redis
#
# Testing:
#   - Tests do NOT run during Docker build (no service dependencies)
#   - Run on host machine BEFORE building Docker image
#   - Tests require PostgreSQL + Redis (via docker-compose)
#
# Workflow:
#   Local Development:
#     1. Start services: pnpm docker:postgres
#     2. Setup test DB: pnpm test:db:setup
#     3. Run tests: pnpm test
#     4. Build production image: docker build ...
#
#   CI/CD Pipeline:
#     1. Start services (docker-compose or CI services)
#     2. Run tests with coverage
#     3. Build Docker image ONLY if tests pass
#
# Test database management: pnpm test:db:setup
# See scripts/test-db/ for database management
#==============================================================================

#------------------------------------------------------------------------------
# Stage 1: Backend Dependencies
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS backend-deps

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration and root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy backend package file
COPY backend/package.json ./backend/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --filter=@fastify-oauth-api/backend

#------------------------------------------------------------------------------
# Stage 2: Backend Builder
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS backend-builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration and root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy backend package file
COPY backend/package.json ./backend/

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile --filter=@fastify-oauth-api/backend

# Copy backend config and source code
COPY backend/tsconfig.json ./backend/
COPY backend/drizzle.config.ts ./backend/
COPY backend/src ./backend/src

# Build TypeScript
WORKDIR /app/backend
RUN pnpm build:prod

#------------------------------------------------------------------------------
# Stage 3: Frontend Builder (Admin Panel)
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS frontend-builder

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration and root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy frontend package file
COPY frontend/package.json ./frontend/

# Install frontend dependencies
RUN pnpm install --frozen-lockfile --filter=frontend

# Copy frontend source code
COPY frontend/ ./frontend/

# Build frontend (Next.js admin panel)
WORKDIR /app/frontend
RUN pnpm build

#------------------------------------------------------------------------------
# Stage 4: Production
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache \
    dumb-init \
    wget \
    curl

# Create app directory
WORKDIR /app/backend

# Create non-root user (nodejs:nodejs with uid:gid 1001:1001)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy built backend assets from builder stage
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/dist ./dist
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/package.json ./

# Copy production dependencies from deps stage (pnpm workspace structure)
COPY --from=backend-deps --chown=nodejs:nodejs /app/node_modules ../node_modules
COPY --from=backend-deps --chown=nodejs:nodejs /app/backend/node_modules ./node_modules

# Copy drizzle config for migrations
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/drizzle.config.ts ./

# Copy database migrations
COPY --chown=nodejs:nodejs backend/src/db/migrations ./src/db/migrations

# Copy built frontend (admin panel) from frontend-builder stage
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/.next ../frontend/.next
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/public ../frontend/public
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/package.json ../frontend/

# Create keys directory (will be mounted as volume)
RUN mkdir -p /app/keys && \
    chown -R nodejs:nodejs /app/keys

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 1337

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=40s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:1337/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
