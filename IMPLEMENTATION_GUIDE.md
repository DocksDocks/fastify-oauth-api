# Fastify OAuth API - Development Setup Guide

This comprehensive guide walks you through setting up and running the Fastify OAuth API in development mode, including configuring Google and Apple OAuth providers, understanding all environment variables, and managing Docker containers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Docker Containers Deep Dive](#docker-containers-deep-dive)
5. [Running in Development Mode](#running-in-development-mode)
6. [Google OAuth Setup](#google-oauth-setup)
7. [Apple OAuth Setup](#apple-oauth-setup-requires-paid-account)
8. [Testing OAuth Flows](#testing-oauth-flows)
9. [Admin User Setup](#admin-user-setup)
10. [API Endpoints](#api-endpoints)
11. [Configuration Best Practices](#configuration-best-practices)
12. [Secret Generation](#secret-generation)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 22+** installed
- **Docker Desktop** or **Docker Engine + Docker Compose** (v2.39.4+)
- **Git** for version control
- A **Google Account** (for Google OAuth setup)
- An **Apple Developer Account** ($99/year, optional for now)

---

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd /home/docks/Documents/projects/fastify-oauth-api

# Install Node.js dependencies
npm install
```

### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

**Important:** You'll need to configure the variables in `.env` according to your needs. See the [Environment Variables Reference](#environment-variables-reference) section below for complete documentation of all variables.

### 3. Start Docker Services

Start PostgreSQL and Redis using Docker:

```bash
# Start all services (PostgreSQL, Redis, Caddy)
npm run docker:start

# Or start individually:
npm run docker:postgres
npm run docker:redis

# Check health of all services
npm run docker:health

# View logs
npm run docker:logs
```

Expected output:
```
✓ PostgreSQL is running on port 5432
✓ Redis is running on port 6379
```

### 4. Run Database Migrations

Generate and apply database migrations:

```bash
# Generate migration files from Drizzle schema
npm run db:generate

# Apply migrations to database
npm run db:migrate

# (Optional) Open Drizzle Studio to view database
npm run db:studio
```

---

## Environment Variables Reference

This section documents **ALL** environment variables from `.env.example`. Each variable is explained with its purpose, default value, and production recommendations.

### Application Configuration

```env
# Environment mode
NODE_ENV=development
# Values: development | production
# Production: Set to 'production' for optimizations and security

# API Server Port
PORT=3000
# The port your Fastify API will listen on
# Production: Usually 3000, but can be changed

# API Server Host
HOST=0.0.0.0
# Bind address for the server
# 0.0.0.0 = listen on all network interfaces
# localhost = listen only on loopback

# API Version Prefix
API_VERSION=v1
# Used for API versioning (e.g., /api/v1/users)
# Optional, can be omitted

# Node.js Memory Limit
NODE_OPTIONS=--max-old-space-size=512
# Heap memory limit in MB
# For Raspberry Pi 4B: 512MB recommended
# For servers with more RAM: increase as needed
# Comment out to use Node.js default (usually ~1.4GB)
```

### Docker Configuration

```env
# Container Names
CONTAINER_POSTGRES_NAME=fastify-oauth-postgres
CONTAINER_REDIS_NAME=fastify-oauth-redis
CONTAINER_API_NAME=fastify-oauth-api
CONTAINER_CADDY_NAME=fastify-oauth-caddy
# Used in docker-compose.yml as ${CONTAINER_*_NAME}
# Change to avoid conflicts with other projects

# Docker Network
DOCKER_NETWORK_NAME=api-network
# Custom network for service communication
# All containers will connect to this network

# Docker Image Versions
POSTGRES_VERSION=15-alpine
REDIS_VERSION=7-alpine
NODE_VERSION=22-alpine
CADDY_VERSION=2-alpine
# Pin specific versions for reproducibility
# NEVER use :latest in production

# Docker Build Target
BUILD_TARGET=production
# Values: development | production
# Controls which Dockerfile stage to use
```

### Database (PostgreSQL)

```env
# Database Host
DATABASE_HOST=postgres
# Service name from docker-compose.yml
# Use 'localhost' if running DB outside Docker

# Database Port
DATABASE_PORT=5432
# Standard PostgreSQL port

# Database User
DATABASE_USER=postgres
# Database username
# Production: Create a dedicated user with limited permissions

# Database Password
DATABASE_PASSWORD=postgres_change_me_in_production
# ⚠️ CRITICAL: Change this in production!
# Generate with: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
# Production: Use secret manager, not .env file

# Database Name
DATABASE_NAME=fastify_oauth_db
# Name of your database

# SSL Configuration
DATABASE_SSL=false
# Enable SSL for database connections
# Production: Set to 'true' if database is remote

# Connection Pool Settings
DATABASE_POOL_MIN=2
# Minimum number of connections to maintain
DATABASE_POOL_MAX=10
# Maximum number of connections allowed
# Adjust based on your workload and database capacity
```

### Redis

```env
# Redis Host
REDIS_HOST=redis
# Service name from docker-compose.yml
# Use 'localhost' if running Redis outside Docker

# Redis Port
REDIS_PORT=6379
# Standard Redis port

# Redis Password
REDIS_PASSWORD=
# Leave empty for development
# Production: Set a strong password!
# Generate with: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Redis Database Number
REDIS_DB=0
# Redis supports multiple databases (0-15)
# 0 is the default

# Redis Key Prefix
REDIS_KEY_PREFIX=fastify:
# Prefix for all Redis keys
# Useful for namespacing in shared Redis instances

# Cache TTL (seconds)
REDIS_CACHE_TTL=300
# Time-to-live for cached data (5 minutes)

# Session TTL (seconds)
REDIS_SESSION_TTL=3600
# Time-to-live for session data (1 hour)
```

### JWT Configuration

```env
# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production
# ⚠️ CRITICAL: Change this in production!
# Must be at least 32 characters
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Production: Use secret manager, not .env file

# Access Token Lifetime
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
# How long access tokens are valid
# Format: 60, "2 days", "10h", "7d", "15m"
# Shorter = more secure, but more refresh requests

# Refresh Token Lifetime
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
# How long refresh tokens are valid
# Format: same as access token
# Balance between security and user experience

# JWT Issuer
JWT_ISSUER=fastify-oauth-api
# Identifies who issued the token
# Optional, used for validation

# JWT Audience
JWT_AUDIENCE=fastify-oauth-api
# Identifies who the token is intended for
# Optional, used for validation

# JWT Algorithm
JWT_ALGORITHM=HS256
# Signing algorithm
# Options: HS256, HS384, HS512, RS256, RS384, RS512
# HS256 is symmetric, RS256 is asymmetric (requires public/private key)
```

### Admin Configuration

```env
# Primary Admin Email
ADMIN_EMAIL=admin@example.com
# This email will be auto-promoted to admin role on OAuth login
# ⚠️ IMPORTANT: Set this to YOUR email address

# Additional Admin Emails
ADMIN_EMAILS_ADDITIONAL=admin2@example.com,admin3@example.com
# Comma-separated list of additional admin emails
# All listed emails will be auto-promoted to admin
# Leave empty if only one admin
```

### Google OAuth

```env
# Google Client ID
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
# Get from Google Cloud Console > APIs & Credentials
# See "Google OAuth Setup" section below

# Google Client Secret
GOOGLE_CLIENT_SECRET=your-google-client-secret
# Get from Google Cloud Console > APIs & Credentials
# ⚠️ Keep this secret!

# Google Redirect URI
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
# Must match exactly what you registered in Google Cloud Console
# Production: Use your production domain with HTTPS

# Google OAuth Scopes
GOOGLE_SCOPES=openid email profile
# Space-separated list of permissions to request
# openid = OpenID Connect authentication
# email = User's email address
# profile = User's name and profile picture
```

### Apple Sign-In

```env
# Apple Client ID (Service ID)
APPLE_CLIENT_ID=com.yourcompany.yourapp.signin
# Get from Apple Developer Portal > Identifiers > Services IDs
# Format: reverse domain notation

# Apple Team ID
APPLE_TEAM_ID=YOUR_TEAM_ID
# 10-character team ID
# Get from Apple Developer Portal > Membership

# Apple Key ID
APPLE_KEY_ID=YOUR_KEY_ID
# 10-character key ID
# Get when you create the private key

# Apple Private Key Path
APPLE_PRIVATE_KEY_PATH=./keys/apple-private-key.p8
# Path to the .p8 file downloaded from Apple
# ⚠️ NEVER commit this file to version control!
# Add keys/ to .gitignore

# Apple Redirect URI
APPLE_REDIRECT_URI=http://localhost:3000/api/auth/apple/callback
# Must match what you registered in Apple Developer Portal
# Production: Use your production domain with HTTPS

# Apple OAuth Scopes
APPLE_SCOPES=name email
# Space-separated list of permissions
# name = User's first and last name (only provided on first login)
# email = User's email (may be anonymized if user chooses)
```

### Caddy Reverse Proxy

```env
# Caddy Domain
CADDY_DOMAIN=localhost
# Domain name for your API
# Development: Use 'localhost'
# Production: Use your actual domain (e.g., 'api.example.com')

# Caddy Email
CADDY_EMAIL=admin@example.com
# Email for Let's Encrypt certificate notifications
# Required for automatic HTTPS in production

# ACME Certificate Authority
CADDY_ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory
# Development: Use Let's Encrypt staging to avoid rate limits
# Production: https://acme-v02.api.letsencrypt.org/directory

# API Backend Host
API_HOST=api
# Service name from docker-compose.yml
# Caddy will proxy requests to this service

# API Backend Port
API_PORT=3000
# Port that the API service listens on
```

### Logging

```env
# Log Level
LOG_LEVEL=info
# Options: trace | debug | info | warn | error | fatal
# Development: debug or info
# Production: info or warn

# Pretty Print Logs
LOG_PRETTY_PRINT=true
# true = human-readable logs (for development)
# false = JSON logs (for production log aggregation)
# Production: MUST be false for proper log parsing
```

### CORS Configuration

```env
# Allowed Origins
CORS_ORIGIN=*
# Comma-separated list of allowed origins
# Development: * (allows all origins)
# Production: Specify exact domains (e.g., 'https://example.com,https://app.example.com')

# Allowed Methods
CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
# HTTP methods that are allowed
# Usually you don't need to change this

# Allow Credentials
CORS_CREDENTIALS=true
# Whether to allow cookies and authentication headers
# Required for OAuth flows
```

### Rate Limiting

```env
# Maximum Requests
RATE_LIMIT_MAX=100
# Maximum number of requests per time window
# Adjust based on your API usage patterns

# Time Window (milliseconds)
RATE_LIMIT_WINDOW=60000
# Time window in milliseconds
# 60000 = 1 minute
# Example: 100 requests per 1 minute

# Ban Duration (milliseconds)
RATE_LIMIT_BAN=0
# How long to ban IP after exceeding limit
# 0 = no ban, just reject requests
# Example: 300000 = 5 minutes ban
```

### Session Configuration

```env
# Session Secret
SESSION_SECRET=your-super-secret-session-key-change-me-in-production
# ⚠️ CRITICAL: Change this in production!
# Used to sign session cookies
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session Cookie Name
SESSION_COOKIE_NAME=fastify_oauth_session
# Name of the session cookie
# Change if you have multiple apps on same domain

# Session Max Age (milliseconds)
SESSION_MAX_AGE=604800000
# How long sessions last
# 604800000 = 7 days
```

### Security

```env
# HTTPS Redirect
HTTPS_REDIRECT=false
# Redirect HTTP to HTTPS
# Development: false (using localhost)
# Production: true (Caddy handles this automatically)

# HSTS Enabled
HSTS_ENABLED=true
# HTTP Strict Transport Security
# Forces browsers to use HTTPS
# Production: true

# HSTS Max Age (seconds)
HSTS_MAX_AGE=31536000
# How long browsers remember to use HTTPS
# 31536000 = 1 year
```

### Swagger Documentation

```env
# Enable Swagger UI
SWAGGER_ENABLED=true
# Whether to expose Swagger UI
# Development: true (helpful for testing)
# Production: false or protect with authentication

# Swagger Route Path
SWAGGER_ROUTE=/documentation
# Where Swagger UI is accessible
# Example: http://localhost:3000/documentation
```

---

## Docker Containers Deep Dive

This section provides detailed information about each Docker container, their configurations, resource limits, and how they interact.

### Service Overview

| Service | Image | Port(s) | Resources | Health Check | Persistence |
|---------|-------|---------|-----------|--------------|-------------|
| **postgres** | postgres:15-alpine | 5432 | 512MB RAM, 1 CPU | `pg_isready -U postgres` every 10s | Named volume |
| **redis** | redis:7-alpine | 6379 | 256MB RAM, 0.5 CPU | `redis-cli ping` every 10s | Named volume |
| **api** | custom (node:22-alpine) | 3000 | 512MB RAM, 1 CPU | `curl /health` every 30s | None |
| **caddy** | caddy:2-alpine | 80, 443 | 256MB RAM, 0.5 CPU | `caddy version` every 30s | Named volume |

**Total Resources:** ~1.5GB RAM, ~3 CPUs (perfect for Raspberry Pi 4B with 4GB RAM)

### Network Architecture

All containers are connected to a custom bridge network called `api-network`:

```
┌─────────────────────────────────────────────────┐
│             api-network (bridge)                │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ postgres │  │  redis   │  │   api    │     │
│  │   5432   │  │   6379   │  │   3000   │     │
│  └──────────┘  └──────────┘  └────┬─────┘     │
│                                    │           │
│                              ┌─────▼─────┐     │
│                              │   caddy   │     │
│                              │  80, 443  │     │
│                              └───────────┘     │
└─────────────────────────────────────────────────┘
                                    │
                                    ▼
                              Internet (HTTPS)
```

**Flow:**
1. External requests → Caddy (ports 80/443)
2. Caddy → API (port 3000)
3. API → PostgreSQL (port 5432)
4. API → Redis (port 6379)

### PostgreSQL Container

**Configuration:**
```yaml
Image: postgres:15-alpine
Container Name: ${CONTAINER_POSTGRES_NAME}
Port: 5432
User: postgres (non-root, UID varies)
Resources:
  Memory: 512MB
  CPUs: 1.0
Health Check: pg_isready -U postgres (every 10s)
Restart Policy: unless-stopped
```

**Features:**
- **Persistence**: Named volume `fastify_oauth_postgres_data` mounted at `/var/lib/postgresql/data`
- **Custom Config**: `docker/database/postgresql.conf` optimized for Raspberry Pi
- **Init Scripts**: `docker/database/init-db.sh` runs on first startup
- **Backup Script**: `docker/database/backup-internal.sh` for automated backups
- **Security**: No default passwords, configured via environment variables

**Key Configuration Settings** (in `postgresql.conf`):
```ini
max_connections = 100          # Adjust based on needs
shared_buffers = 128MB         # 25% of total RAM for DB
effective_cache_size = 256MB   # 50% of available RAM
work_mem = 4MB                 # Per-operation memory
maintenance_work_mem = 64MB    # For VACUUM, CREATE INDEX, etc.
```

**Accessing PostgreSQL:**
```bash
# Via Docker exec
npm run docker:postgres:exec
# Or:
docker exec -it ${CONTAINER_POSTGRES_NAME} psql -U postgres -d fastify_oauth_db

# Via local psql (if installed)
psql postgresql://postgres:YOUR_PASSWORD@localhost:5432/fastify_oauth_db

# Create backup
npm run docker:postgres:backup
```

### Redis Container

**Configuration:**
```yaml
Image: redis:7-alpine
Container Name: ${CONTAINER_REDIS_NAME}
Port: 6379
User: redis (non-root, UID varies)
Resources:
  Memory: 256MB
  CPUs: 0.5
Health Check: redis-cli ping (every 10s)
Restart Policy: unless-stopped
```

**Features:**
- **Persistence**: Named volume `fastify_oauth_redis_data` mounted at `/data`
- **Custom Config**: `docker/redis/redis.conf` with optimized settings
- **RDB Snapshots**: Configured for periodic saves
- **Memory Limit**: 256MB max (configured in redis.conf)
- **Eviction Policy**: allkeys-lru (evict least recently used keys when memory full)

**Key Configuration Settings** (in `redis.conf`):
```ini
maxmemory 256mb                      # Maximum memory usage
maxmemory-policy allkeys-lru         # Eviction strategy
save 900 1                           # Save if 1 key changed in 900s
save 300 10                          # Save if 10 keys changed in 300s
save 60 10000                        # Save if 10000 keys changed in 60s
appendonly no                        # AOF disabled (RDB only)
```

**Accessing Redis:**
```bash
# Via Docker exec
npm run docker:redis:exec
# Or:
docker exec -it ${CONTAINER_REDIS_NAME} redis-cli

# Via local redis-cli (if installed)
redis-cli -h localhost -p 6379

# Monitor commands in real-time
docker exec -it ${CONTAINER_REDIS_NAME} redis-cli MONITOR

# Get info
docker exec -it ${CONTAINER_REDIS_NAME} redis-cli INFO
```

### API Container

**Configuration:**
```yaml
Image: custom (multi-stage build from node:22-alpine)
Container Name: ${CONTAINER_API_NAME}
Port: 3000
User: nodejs (non-root, UID 1001, GID 1001)
Resources:
  Memory: 512MB
  CPUs: 1.0
Health Check: curl http://localhost:3000/health (every 30s)
Restart Policy: unless-stopped
Depends On: postgres, redis
```

**Multi-Stage Dockerfile:**
```dockerfile
# Stage 1: Dependencies (all dependencies)
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build (compile TypeScript)
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build:prod

# Stage 3: Production (minimal runtime)
FROM node:22-alpine AS production
WORKDIR /app
USER nodejs:nodejs (1001:1001)
COPY --from=build /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
CMD ["node", "dist/server.js"]
```

**Features:**
- **Non-root User**: Runs as `nodejs:nodejs` (UID 1001, GID 1001)
- **TypeScript Compiled**: Uses compiled JavaScript from `dist/`
- **Hot Reload** (development): Via `npm run dev` on host machine
- **Environment Variables**: All configuration via `.env`
- **Health Check**: Fastify `/health` endpoint

**Accessing API Container:**
```bash
# View logs
npm run docker:api:log

# Shell access
npm run docker:api:exec

# Rebuild after code changes
npm run docker:api:rebuild
```

### Caddy Container

**Configuration:**
```yaml
Image: caddy:2-alpine
Container Name: ${CONTAINER_CADDY_NAME}
Ports: 80 (HTTP), 443 (HTTPS)
User: caddy (non-root)
Resources:
  Memory: 256MB
  CPUs: 0.5
Health Check: caddy version (every 30s)
Restart Policy: unless-stopped
Depends On: api
```

**Features:**
- **Automatic HTTPS**: Via Let's Encrypt (configured by `CADDY_ACME_CA`)
- **Reverse Proxy**: Forwards all requests to API container
- **Certificate Storage**: Named volume `fastify_oauth_caddy_data` at `/data`
- **Auto-Renewal**: Certificates renewed automatically before expiration
- **Configuration**: `docker/caddy/Caddyfile`

**Caddyfile Configuration:**
```caddyfile
{$CADDY_DOMAIN} {
    reverse_proxy {$API_HOST}:{$API_PORT}
    
    log {
        output stdout
        format json
    }
    
    tls {$CADDY_EMAIL} {
        ca {$CADDY_ACME_CA}
    }
}
```

**Accessing Caddy:**
```bash
# View logs
npm run docker:caddy:log

# Reload configuration (without downtime)
npm run docker:caddy:reload

# Shell access
npm run docker:caddy:exec
```

### Named Volumes

Docker Compose creates named volumes for data persistence:

```bash
# List volumes
docker volume ls | grep fastify_oauth

# Inspect volume
docker volume inspect fastify_oauth_postgres_data

# Backup volume (example for PostgreSQL)
docker run --rm \
  -v fastify_oauth_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore volume
docker run --rm \
  -v fastify_oauth_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /

# Remove all volumes (⚠️ DATA LOSS!)
docker compose down -v
```

### Container Management Scripts

The `scripts-docker/` directory provides modular management scripts:

**PostgreSQL Scripts:**
```bash
npm run docker:postgres         # Start
npm run docker:postgres:stop    # Stop
npm run docker:postgres:log     # View logs
npm run docker:postgres:exec    # Open psql
npm run docker:postgres:backup  # Create backup
npm run docker:postgres:remove  # Remove container
```

**Redis Scripts:**
```bash
npm run docker:redis            # Start
npm run docker:redis:stop       # Stop
npm run docker:redis:log        # View logs
npm run docker:redis:exec       # Open redis-cli
npm run docker:redis:remove     # Remove container
```

**API Scripts:**
```bash
npm run docker:api              # Start
npm run docker:api:stop         # Stop
npm run docker:api:log          # View logs
npm run docker:api:exec         # Shell access
npm run docker:api:rebuild      # Rebuild & restart
npm run docker:api:remove       # Remove container
```

**Caddy Scripts:**
```bash
npm run docker:caddy            # Start
npm run docker:caddy:stop       # Stop
npm run docker:caddy:log        # View logs
npm run docker:caddy:exec       # Shell access
npm run docker:caddy:reload     # Reload config
npm run docker:caddy:remove     # Remove container
```

**System Scripts:**
```bash
npm run docker:start            # Start all services
npm run docker:stop             # Stop all services
npm run docker:health           # Health check all
npm run docker:logs             # View all logs
npm run docker:restart          # Restart all
```

---
## Running in Development Mode

### Option 1: Local Development (Recommended)

Run the API locally with hot-reloading while Docker handles the database and cache:

```bash
# 1. Start Docker services (DB + Redis only)
npm run docker:postgres
npm run docker:redis

# 2. Run API locally with hot reload
npm run dev
```

The API will be available at:
- **API Server:** http://localhost:3000
- **Health Check:** http://localhost:3000/health
- **Swagger UI:** http://localhost:3000/documentation (when enabled)

**What's happening:**
- `tsx watch` runs TypeScript directly with hot-reloading
- Database runs in Docker (localhost:5432)
- Redis runs in Docker (localhost:6379)
- API runs on your local machine (localhost:3000)
- Code changes trigger automatic restart

**Advantages:**
- ✅ Instant hot reload
- ✅ Easy debugging (attach debugger)
- ✅ Direct access to TypeScript source
- ✅ Faster iteration cycle

### Option 2: Full Docker Stack

Run everything in Docker containers:

```bash
# Build and start all services
npm run docker:start

# View API logs
npm run docker:api:log

# Stop all services
npm run docker:stop
```

**When to use this:**
- Testing production-like environment
- Testing Caddy reverse proxy
- Debugging Docker networking issues
- Testing resource limits
- CI/CD pipeline testing

---

## Google OAuth Setup

To enable Google Sign-In, you need to create OAuth 2.0 credentials in Google Cloud Console.

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Fastify OAuth API`
4. Click **Create**
5. Wait for project creation (usually takes a few seconds)

### Step 2: Enable APIs

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for **People API**
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (for testing)
3. Click **Create**
4. Fill in required fields:
   - **App name:** Fastify OAuth API
   - **User support email:** your-email@gmail.com
   - **Developer contact:** your-email@gmail.com
5. Click **Save and Continue**
6. **Scopes:** Click **Add or Remove Scopes**, select:
   - `/auth/userinfo.email`
   - `/auth/userinfo.profile`
   - `openid`
7. Click **Update** → **Save and Continue**
8. **Test users:** Click **Add Users**, add your Gmail address
9. Click **Save and Continue**
10. Review and click **Back to Dashboard**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name:** Fastify OAuth Web Client
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/google/callback`
5. Click **Create**
6. **Copy credentials:**
   - Copy the **Client ID**
   - Copy the **Client Secret**

### Step 5: Update .env File

```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop1234567890
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_SCOPES=openid email profile
```

### Step 6: Restart API Server

```bash
# If running locally
# Just save the .env file (hot reload will pick it up)

# If running in Docker
npm run docker:api:rebuild
```

### Step 7: Test Google OAuth

```bash
# Get Google OAuth URL
curl http://localhost:3000/api/auth/google

# Response:
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
  }
}
```

Open the `authUrl` in your browser to test the OAuth flow.

---

## Apple OAuth Setup (Requires Paid Account)

**Note:** Apple OAuth requires an Apple Developer Program membership ($99/year). The code is ready, but you'll configure this later when you have an account.

### Prerequisites

- Apple Developer Program membership ($99/year)
- Access to [Apple Developer Portal](https://developer.apple.com/account/)

### Step 1: Register App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** (Add new)
4. Choose **App IDs** → Continue
5. Configure:
   - **Description:** Fastify OAuth API
   - **Bundle ID:** `com.yourcompany.fastifyoauth` (explicit)
   - **Capabilities:** Enable **Sign in with Apple**
6. Click **Continue** → **Register**

### Step 2: Create Services ID

1. Click **Identifiers** → **+** (Add new)
2. Choose **Services IDs** → Continue
3. Configure:
   - **Description:** Fastify OAuth Web Service
   - **Identifier:** `com.yourcompany.fastifyoauth.signin`
4. Check **Sign in with Apple**
5. Click **Configure**
6. Add domain and return URL:
   - **Domains and Subdomains:** `localhost` (for dev)
   - **Return URLs:** `http://localhost:3000/api/auth/apple/callback`
7. Click **Next** → **Done** → **Continue** → **Register**

**Note for Production:**
- Domains must not include port numbers
- Return URLs must use HTTPS (except for localhost)
- Add your production domain in addition to localhost

### Step 3: Create Private Key

1. Click **Keys** → **+** (Add new)
2. Configure:
   - **Key Name:** Fastify OAuth Apple Key
   - Check **Sign in with Apple**
3. Click **Configure** → Choose your App ID
4. Click **Save** → **Continue** → **Register**
5. **Download the key** (`.p8` file) - ⚠️ YOU ONLY GET ONE CHANCE!
6. Note the **Key ID** (shown after download, 10 characters)

### Step 4: Get Team ID

1. Go to **Membership** in Apple Developer Portal
2. Copy your **Team ID** (10-character string like `ABC123XYZ9`)

### Step 5: Configure Private Key

Save the downloaded `.p8` key file:

```bash
# Create keys directory
mkdir -p /home/docks/Documents/projects/fastify-oauth-api/keys

# Move the downloaded key
mv ~/Downloads/AuthKey_*.p8 /home/docks/Documents/projects/fastify-oauth-api/keys/apple-private-key.p8

# Set permissions
chmod 600 /home/docks/Documents/projects/fastify-oauth-api/keys/apple-private-key.p8
```

**Important:** Add `keys/` to `.gitignore` to prevent committing secrets!

```bash
echo "keys/" >> .gitignore
```

### Step 6: Update .env File

```env
APPLE_CLIENT_ID=com.yourcompany.fastifyoauth.signin
APPLE_TEAM_ID=ABC123XYZ9
APPLE_KEY_ID=XYZ123ABC9
APPLE_PRIVATE_KEY_PATH=./keys/apple-private-key.p8
APPLE_REDIRECT_URI=http://localhost:3000/api/auth/apple/callback
APPLE_SCOPES=name email
```

### Step 7: Test Apple OAuth

```bash
# Get Apple OAuth URL
curl http://localhost:3000/api/auth/apple

# Response:
{
  "success": true,
  "data": {
    "authUrl": "https://appleid.apple.com/auth/authorize?client_id=..."
  }
}
```

---

## Testing OAuth Flows

### Test Google OAuth Flow

**1. Get OAuth URL:**
```bash
curl http://localhost:3000/api/auth/google
```

**2. Open URL in browser** and sign in with your Google account

**3. You'll be redirected to callback URL** with your tokens:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "your-email@gmail.com",
      "name": "Your Name",
      "avatar": "https://lh3.googleusercontent.com/...",
      "role": "admin"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

**4. Copy the accessToken** and test authenticated endpoints:
```bash
# Store token for convenience
export TOKEN="YOUR_ACCESS_TOKEN"

# Get your profile
curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer $TOKEN"

# Update your profile
curl -X PATCH http://localhost:3000/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

### Test Admin Endpoints

If your email matches `ADMIN_EMAIL` in `.env`, you'll be auto-promoted to admin:

```bash
# List all users (admin only)
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"

# Get user statistics
curl http://localhost:3000/api/admin/users/stats \
  -H "Authorization: Bearer $TOKEN"

# Get specific user
curl http://localhost:3000/api/admin/users/1 \
  -H "Authorization: Bearer $TOKEN"

# Update user role (admin can't promote to superadmin)
curl -X PATCH http://localhost:3000/api/admin/users/2/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### Test Token Refresh

```bash
# Save refresh token
export REFRESH_TOKEN="YOUR_REFRESH_TOKEN"

# Refresh access token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

# Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### Test Token Verification

```bash
# Verify access token
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "success": true,
  "data": {
    "id": 1,
    "email": "your-email@gmail.com",
    "role": "admin"
  }
}
```

---

## Admin User Setup

### Auto-Promotion via Environment Variable

The easiest way to become an admin is to set your email in `.env`:

```env
ADMIN_EMAIL=your-email@gmail.com
```

When you sign in with Google OAuth, you'll automatically be promoted to admin role.

**How it works:**
1. You sign in via OAuth (Google or Apple)
2. Server checks if your email matches `ADMIN_EMAIL` or is in `ADMIN_EMAILS_ADDITIONAL`
3. If match found, role is set to `admin` (or upgraded from `user` to `admin`)
4. JWT tokens include `role: 'admin'`
5. You can now access admin endpoints

### Manual Promotion via Seed Script

If you've already signed in and want to promote yourself or others:

```bash
# Run the seed script
npm run db:seed
```

**Output:**
```
[Seed] Promoting admin users...
[Seed] ✓ Promoted your-email@gmail.com to admin
[Seed] ⚠ User admin2@example.com not found (must sign in via OAuth first)
[Seed] Done!
```

**Notes:**
- Users must have signed in at least once via OAuth
- Script only promotes users with `role='user'` (doesn't demote)
- Script reads from `ADMIN_EMAIL` and `ADMIN_EMAILS_ADDITIONAL`

### Adding Multiple Admins

```env
ADMIN_EMAIL=admin1@gmail.com
ADMIN_EMAILS_ADDITIONAL=admin2@gmail.com,admin3@gmail.com,admin4@gmail.com
```

All listed emails will be auto-promoted to admin on their first (or next) OAuth login.

---

## API Endpoints

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/health` | Health check (returns `{"status":"ok"}`) |
| GET | `/api/auth/google` | Get Google OAuth authorization URL |
| GET | `/api/auth/google/callback` | Google OAuth callback (receives code, returns tokens) |
| GET | `/api/auth/apple` | Get Apple OAuth authorization URL |
| POST | `/api/auth/apple/callback` | Apple OAuth callback (receives code + id_token, returns tokens) |
| POST | `/api/auth/refresh` | Refresh access token using refresh token |
| GET | `/api/auth/verify` | Verify access token validity |
| POST | `/api/auth/logout` | Logout (client-side token discard) |

### Protected Endpoints (Require JWT Authentication)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/profile` | Get current user profile | user+ |
| PATCH | `/api/profile` | Update profile (name, avatar) | user+ |
| DELETE | `/api/profile` | Delete own account | user+ |

### Admin Endpoints (Require Admin Role)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/admin/users` | List all users (pagination, search, sort) | admin+ |
| GET | `/api/admin/users/stats` | User statistics (total, by role, by provider) | admin+ |
| GET | `/api/admin/users/:id` | Get user by ID | admin+ |
| PATCH | `/api/admin/users/:id/role` | Update user role | admin+ (superadmin for superadmin role) |
| DELETE | `/api/admin/users/:id` | Delete user | admin+ (superadmin for superadmin users) |

**Query Parameters for GET /api/admin/users:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Results per page
- `search` - Search in email and name
- `sortBy` (default: createdAt) - Sort by field (createdAt, email, lastLoginAt)
- `sortOrder` (default: desc) - Sort order (asc, desc)

**Example:**
```bash
curl "http://localhost:3000/api/admin/users?page=1&limit=10&search=gmail&sortBy=email&sortOrder=asc" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Configuration Best Practices

### Development Configuration

**Recommended `.env` for local development:**

```env
# Permissive for development
NODE_ENV=development
LOG_PRETTY_PRINT=true
CORS_ORIGIN=*
SWAGGER_ENABLED=true

# Weak credentials (local only!)
DATABASE_PASSWORD=postgres
REDIS_PASSWORD=
JWT_SECRET=dev-secret-change-in-production

# Let's Encrypt staging (avoid rate limits)
CADDY_ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory
CADDY_DOMAIN=localhost

# OAuth with localhost redirects
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
APPLE_REDIRECT_URI=http://localhost:3000/api/auth/apple/callback
```

**Benefits:**
- Fast iteration (pretty logs, permissive CORS)
- No rate limits (staging Let's Encrypt)
- Easy debugging (Swagger enabled)
- Simple setup (no strong passwords needed)

### Production Configuration

**Recommended `.env` for production:**

```env
# Strict for production
NODE_ENV=production
LOG_PRETTY_PRINT=false
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
SWAGGER_ENABLED=false  # Or protect with auth

# Strong credentials (CRITICAL!)
DATABASE_PASSWORD=<64-char-random-string>
REDIS_PASSWORD=<32-char-random-string>
JWT_SECRET=<64-char-random-string>
SESSION_SECRET=<64-char-random-string>

# SSL/TLS
DATABASE_SSL=true
HTTPS_REDIRECT=true

# Let's Encrypt production
CADDY_ACME_CA=https://acme-v02.api.letsencrypt.org/directory
CADDY_DOMAIN=api.yourdomain.com
CADDY_EMAIL=admin@yourdomain.com

# OAuth with production redirects (HTTPS only!)
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/google/callback
APPLE_REDIRECT_URI=https://api.yourdomain.com/api/auth/apple/callback

# Resource optimization
NODE_OPTIONS=--max-old-space-size=1024  # Increase for production
RATE_LIMIT_MAX=50  # Stricter rate limiting
```

**Security Checklist:**
- ✅ All secrets are 32+ characters random
- ✅ Secrets stored in secret manager (not in .env file)
- ✅ CORS restricted to specific domains
- ✅ Swagger disabled or protected
- ✅ HTTPS enforced (Caddy handles)
- ✅ Database SSL enabled if remote
- ✅ Redis password set
- ✅ JSON logs for aggregation

---

## Secret Generation

Use these commands to generate secure secrets for production:

### JWT Secret (32+ characters)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Example output: 5f7d6c8e9a3b1c2f4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b
```

### Database Password (16+ characters)

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
# Example output: 3a5f7c9e1b4d6f8a2c5e7b9d1f3a5c
```

### Session Secret (32+ characters)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Redis Password (16+ characters)

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### All Secrets at Once

```bash
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "DATABASE_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "REDIS_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
```

**Copy the output directly into your `.env` file.**

---

## Troubleshooting

### Docker Services Not Starting

**Problem:** Containers won't start or restart loop

**Solutions:**
```bash
# Check Docker is running
docker info

# Remove all containers and volumes, start fresh
docker compose down -v
npm run docker:start

# Check logs for specific service
npm run docker:postgres:log
npm run docker:redis:log
npm run docker:api:log

# Check container status
docker compose ps
```

### Database Connection Errors

**Problem:** `ECONNREFUSED` or `Connection timeout`

**Solutions:**
```bash
# Check PostgreSQL is running
docker compose exec postgres pg_isready -U postgres
# Should output: postgres:5432 - accepting connections

# Check DATABASE_URL is correct in .env
cat .env | grep DATABASE

# View PostgreSQL logs
npm run docker:postgres:log

# Test connection from host
psql postgresql://postgres:YOUR_PASSWORD@localhost:5432/fastify_oauth_db

# If using Docker network, use service name 'postgres' not 'localhost'
```

### Redis Connection Errors

**Problem:** `ECONNREFUSED` or `Redis connection failed`

**Solutions:**
```bash
# Check Redis is running
docker compose exec redis redis-cli ping
# Should output: PONG

# View Redis logs
npm run docker:redis:log

# Test connection from host
redis-cli -h localhost -p 6379 ping

# If password is set
redis-cli -h localhost -p 6379 -a YOUR_PASSWORD ping
```

### OAuth Redirect URI Mismatch

**Problem:** `redirect_uri_mismatch` error

**Solution for Google:**
1. Go to Google Cloud Console > Credentials
2. Click on your OAuth client
3. Ensure redirect URI EXACTLY matches your `.env`:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
4. Save and wait 5 minutes for propagation

**Solution for Apple:**
1. Go to Apple Developer Portal > Identifiers
2. Click on your Services ID
3. Configure Sign in with Apple
4. Ensure redirect URI EXACTLY matches your `.env`:
   - Development: `http://localhost:3000/api/auth/apple/callback`
   - Production: `https://yourdomain.com/api/auth/apple/callback`
5. Save

### JWT Token Expired

**Problem:** `Unauthorized - Invalid or expired token`

**Solutions:**
```bash
# Use refresh token to get new access token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'

# If refresh token also expired, sign in again via OAuth
```

### TypeScript Errors

**Problem:** Path alias errors or module resolution issues

**Solutions:**
```bash
# Check tsconfig.json has correct configuration
cat tsconfig.json | grep -A 5 "paths"

# Should have:
# "baseUrl": "."
# "paths": { "@/*": ["src/*"] }
# "moduleResolution": "bundler"

# Run type check
npm run type-check

# If errors persist, restart TypeScript server (VS Code)
# Cmd/Ctrl + Shift + P → TypeScript: Restart TS Server
```

### Port Already in Use

**Problem:** `EADDRINUSE: address already in use :::3000`

**Solutions:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Permission Denied on Scripts

**Problem:** `bash: ./scripts-docker/start.sh: Permission denied`

**Solutions:**
```bash
# Make all scripts executable
find scripts-docker -name "*.sh" -exec chmod +x {} \;

# Or specific script
chmod +x scripts-docker/start.sh
```

### Environment Variable Not Loading

**Problem:** App doesn't see .env variables

**Solutions:**
```bash
# Check .env file exists
ls -la .env

# Check file is not empty
cat .env

# For Docker, rebuild image
npm run docker:api:rebuild

# For local dev, restart the process
# Ctrl+C and run npm run dev again
```

### Caddy Certificate Issues

**Problem:** Let's Encrypt rate limit or certificate errors

**Solutions:**
```bash
# Use staging CA for development (avoid rate limits)
CADDY_ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory

# Check Caddy logs
npm run docker:caddy:log

# Remove old certificates and restart
docker volume rm fastify_oauth_caddy_data
npm run docker:caddy:rebuild

# For production, ensure:
# - CADDY_DOMAIN is real domain (not localhost)
# - CADDY_EMAIL is valid
# - Domain points to your server IP
# - Ports 80 and 443 are open
```

### Out of Memory (OOM)

**Problem:** Container killed due to memory limit

**Solutions:**
```bash
# Check container stats
docker stats

# Increase memory limits in docker-compose.yml
# For API:
mem_limit: 1024m  # Increase from 512m

# For Raspberry Pi with 4GB RAM, enable SWAP
sudo bash scripts-docker/system/setup-swap.sh

# Monitor memory usage
free -h
```

### Database Migration Errors

**Problem:** Migration fails or schema out of sync

**Solutions:**
```bash
# Generate fresh migration
npm run db:generate

# Check what changed
cat src/db/migrations/0001_*.sql

# Apply migration
npm run db:migrate

# If migration fails, check PostgreSQL logs
npm run docker:postgres:log

# Reset database (⚠️ DATA LOSS!)
docker compose down -v
npm run docker:start
npm run db:migrate
```

---

## Next Steps

1. **Configure OAuth Providers:** Set up Google OAuth (required), Apple OAuth (optional for now)
2. **Set Admin Email:** Update `ADMIN_EMAIL` in `.env` with your email
3. **Test OAuth Flow:** Sign in with Google and verify you're promoted to admin
4. **Explore API:** Test all endpoints with your admin token
5. **Read CLAUDE.md:** Understand the project architecture and best practices
6. **Deploy to Production:** Follow the production checklist in CLAUDE.md

---

## Useful Commands Cheat Sheet

```bash
# Development
npm run dev                      # Start API in development mode
npm run build                    # Build TypeScript to dist/
npm run start                    # Start production build

# Docker - Full Stack
npm run docker:start             # Start all services
npm run docker:stop              # Stop all services
npm run docker:health            # Check service health
npm run docker:logs              # View all logs

# Docker - Individual Services
npm run docker:postgres          # PostgreSQL
npm run docker:redis             # Redis
npm run docker:api               # API
npm run docker:caddy             # Caddy

# Database
npm run db:generate              # Generate Drizzle migrations
npm run db:migrate               # Apply migrations
npm run db:studio                # Open Drizzle Studio (GUI)
npm run db:seed                  # Seed admin users

# Testing & Quality
npm test                         # Run Vitest tests
npm run test:coverage            # Run tests with coverage
npm run lint                     # Run ESLint
npm run lint:fix                 # Fix ESLint errors
npm run format                   # Format with Prettier
npm run type-check               # Check TypeScript types
```

---

## Resources

- **Fastify Documentation:** https://fastify.dev/
- **Drizzle ORM Documentation:** https://orm.drizzle.team/
- **Google OAuth Documentation:** https://developers.google.com/identity/protocols/oauth2
- **Apple Sign In Documentation:** https://developer.apple.com/documentation/sign_in_with_apple
- **Docker Compose Documentation:** https://docs.docker.com/compose/
- **Caddy Documentation:** https://caddyserver.com/docs/

---

**Happy Coding!** 🚀

If you encounter any issues not covered here, check the logs with `npm run docker:logs` or consult the [CLAUDE.md](./CLAUDE.md) file for more detailed technical information.

---

**Last Updated:** October 2025  
**Version:** 2.0 (Comprehensive Guide)
