ARG NODE_VERSION=22-alpine

#------------------------------------------------------------------------------
# Stage 1: Dependencies
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

#------------------------------------------------------------------------------
# Stage 2: Builder
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src ./src

# Build TypeScript
RUN npm run build:prod

#------------------------------------------------------------------------------
# Stage 3: Testing & Coverage Validation
#------------------------------------------------------------------------------
FROM builder AS testing

# Copy test files and configuration
COPY test ./test
COPY vitest.config.ts ./

# Run full test suite with coverage
# This ensures 100% coverage threshold is met before production build
RUN npm run test:coverage

# Display success message
RUN echo "✓ All 410 tests passed with 100% coverage threshold"

#------------------------------------------------------------------------------
# Stage 4: Admin Panel Builder
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS admin-builder

WORKDIR /app/admin

# Copy admin package files
COPY admin/package.json admin/package-lock.json* ./

# Install admin dependencies
RUN npm ci && \
    npm cache clean --force

# Copy admin source code
COPY admin/ ./

# Build admin panel
RUN npm run build

#------------------------------------------------------------------------------
# Stage 5: Production
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache \
    dumb-init \
    wget \
    curl

# Create app directory
WORKDIR /app

# Create non-root user (nodejs:nodejs with uid:gid 1001:1001)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy built assets from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy production dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy drizzle config for migrations
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./

# Copy database files
COPY --chown=nodejs:nodejs src/db/migrations ./src/db/migrations

# Copy built admin panel from admin-builder stage
COPY --from=admin-builder --chown=nodejs:nodejs /app/admin/dist ./admin/dist

# Create keys directory (will be mounted as volume)
RUN mkdir -p /app/keys && \
    chown -R nodejs:nodejs /app/keys

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=40s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]

#------------------------------------------------------------------------------
# Stage 6: Development (optional)
#------------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS development

# Install tools for development
RUN apk add --no-cache \
    dumb-init \
    wget \
    curl \
    bash

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files
COPY --chown=nodejs:nodejs package.json package-lock.json* ./

# Install all dependencies
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs . .

# Create keys directory
RUN mkdir -p /app/keys && \
    chown -R nodejs:nodejs /app/keys

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=40s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Development with hot reload
CMD ["npm", "run", "dev"]
