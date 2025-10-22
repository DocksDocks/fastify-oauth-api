# Fastify v5 OAuth API - Project Context

## Tech Stack (2025 Best Practices)

**Runtime & Framework:**
- Node.js 22+ LTS (ES Modules only)
- Fastify 5.6.1+ (latest v5 ecosystem)
- TypeScript 5.9.3+ with strict mode
- Path aliases (`@/*` → `src/*`)

**Infrastructure:**
- PostgreSQL 15-alpine (primary database)
- Redis 7-alpine (caching & sessions)
- Caddy 2-alpine (reverse proxy + auto HTTPS)
- Docker 27.0+ with Compose v2.39.4+

**ORM & Database:**
- Drizzle ORM 0.44.6+ (type-safe SQL)
- Drizzle Kit for migrations
- PostgreSQL native driver

**Authentication & Authorization:**
- OAuth 2.0 (Google + Apple Sign-In)
- @fastify/jwt for token management
- JWT with role-based access control (RBAC)
- google-auth-library for Google OAuth
- apple-signin-auth for Apple OAuth
- Role hierarchy: user → admin → superadmin

## Project Architecture

```
fastify-oauth-api/
├── docker/                      # Service-specific Docker configs
│   ├── caddy/                   # Reverse proxy
│   │   ├── caddy.Dockerfile
│   │   └── Caddyfile
│   ├── database/                # PostgreSQL
│   │   ├── database.Dockerfile
│   │   ├── postgresql.conf
│   │   ├── init-db.sh
│   │   └── backup-internal.sh
│   ├── redis/                   # Redis cache
│   │   ├── redis.Dockerfile
│   │   └── redis.conf
│   └── server/                  # Fastify app
│       └── server.Dockerfile
├── scripts-docker/              # Modular management scripts
│   ├── postgres/                # DB-specific scripts (run, stop, log, exec, backup, remove)
│   ├── redis/                   # Cache-specific scripts (run, stop, log, exec, remove)
│   ├── api/                     # API-specific scripts (run, stop, log, exec, rebuild, remove)
│   ├── caddy/                   # Proxy-specific scripts (run, stop, log, exec, reload, remove)
│   ├── system/                  # System-wide scripts (start-all, stop-all, restart-all, health-check, logs-all, remove-all, remove-volumes, setup-swap)
│   └── start.sh                 # Quick start script
├── src/
│   ├── config/                  # Configuration layer
│   │   ├── env.ts               # Environment validation (Zod)
│   │   └── index.ts             # Barrel export
│   ├── db/                      # Database layer
│   │   ├── schema/              # Drizzle schemas
│   │   │   ├── users.ts         # Users table with role enum
│   │   │   └── index.ts         # Barrel export
│   │   ├── migrations/          # SQL migrations (auto-generated)
│   │   ├── seeds/               # Seed data
│   │   │   └── index.ts         # Admin seeding script
│   │   └── client.ts            # DB connection (Drizzle)
│   ├── modules/                 # Feature modules
│   │   └── auth/                # Authentication module
│   │       ├── auth.types.ts    # OAuth & JWT types
│   │       ├── auth.service.ts  # Google & Apple OAuth logic
│   │       ├── jwt.service.ts   # JWT token management
│   │       ├── auth.controller.ts # Route handlers
│   │       └── auth.routes.ts   # Route registration
│   ├── routes/                  # API endpoints
│   │   ├── health.ts            # Health check endpoint
│   │   ├── profile.ts           # User profile routes (GET, PATCH, DELETE)
│   │   └── admin/               # Admin routes
│   │       └── users.ts         # User management (list, get, update role, delete, stats)
│   ├── plugins/                 # Fastify plugins
│   │   └── jwt.ts               # JWT plugin with authenticate decorator
│   ├── middleware/              # Custom middleware
│   │   └── authorize.ts         # RBAC middleware (requireAdmin, requireSuperadmin, etc.)
│   ├── utils/                   # Utilities
│   │   ├── logger.ts            # Pino logger setup
│   │   ├── errors.ts            # Custom error classes
│   │   └── response.ts          # Response formatters
│   ├── app.ts                   # Fastify app factory
│   └── server.ts                # Server entry point
├── test/                        # Comprehensive test suite (410 tests, 100% coverage)
├── keys/                        # OAuth private keys (gitignored)
├── docker-compose.yml           # Single orchestration file
├── .env.example                 # Environment template
├── .env                         # Environment variables (gitignored)
├── tsconfig.json                # TypeScript config
├── drizzle.config.ts            # Drizzle config
├── vitest.config.ts             # Vitest config
├── eslint.config.js             # ESLint flat config
├── package.json                 # Dependencies
├── CLAUDE.md                    # This file
├── IMPLEMENTATION_GUIDE.md      # Setup and configuration guide
├── RASPBERRY_PI.md              # RPi deployment guide
└── README.md                    # Project overview
```

## Current Implementation Status

### ✅ Fully Implemented

**Infrastructure:**
- [x] Docker orchestration (single docker-compose.yml)
- [x] Modular scripts-docker/ architecture
- [x] PostgreSQL 15 with health checks
- [x] Redis 7 with persistence
- [x] Caddy reverse proxy
- [x] Multi-stage Dockerfiles
- [x] Non-root users in all containers
- [x] Resource limits (CPU, memory)

**Configuration:**
- [x] Environment validation (Zod)
- [x] TypeScript strict mode
- [x] Path aliases (`@/*`)
- [x] ESLint + Prettier
- [x] Husky git hooks

**Database:**
- [x] Drizzle ORM setup
- [x] Users schema with role enum
- [x] Database migrations
- [x] Admin seeding system
- [x] Connection pooling

**Authentication:**
- [x] Google OAuth flow
- [x] Apple OAuth flow (ready for use)
- [x] JWT token generation
- [x] JWT token verification
- [x] Token refresh mechanism
- [x] Auto-admin promotion

**Authorization (RBAC):**
- [x] Role-based access control
- [x] Three roles: user, admin, superadmin
- [x] Authorization middleware
- [x] Role-based route protection

**API Endpoints:**
- [x] Health check
- [x] OAuth authentication (Google + Apple)
- [x] Token refresh
- [x] Token verification
- [x] User profile management
- [x] Admin user management

**Code Quality:**
- [x] Error handling
- [x] Structured logging (Pino)
- [x] Security headers (Helmet)
- [x] Rate limiting
- [x] CORS
- [x] Compression
- [x] Graceful shutdown

**Testing:**
- [x] Comprehensive test suite (410 tests)
- [x] 100% coverage (lines, functions, statements)
- [x] Unit tests for all services
- [x] Integration tests for all routes
- [x] Middleware and utility tests
- [x] Automated test database setup
- [x] Docker build test validation

### ⏳ Pending Implementation

- [ ] Swagger/OpenAPI documentation

## Development Workflow

**Essential Commands:**
```bash
# Start entire stack
npm run docker:start              # or bash scripts-docker/start.sh

# Stop entire stack
npm run docker:stop

# Check health of all services
npm run docker:health

# View logs
docker compose logs -f           # all services
npm run docker:api:log           # API only
npm run docker:postgres:log      # PostgreSQL only

# Development (local machine, Docker for DB/Redis)
npm run dev                      # Hot reload with tsx

# Database
npm run db:generate              # Generate migrations
npm run db:migrate               # Run migrations
npm run db:studio                # Open Drizzle Studio
npm run db:seed                  # Seed admin users

# Testing
npm test                         # Run tests with Vitest
npm run test:coverage            # Coverage report

# Code Quality
npm run lint                     # ESLint
npm run format                   # Prettier
npm run type-check               # TypeScript
```

## Code Style Standards

**Module System:**
- ES modules exclusively (`import`/`export`)
- No CommonJS (`require`/`module.exports`)
- `"type": "module"` in package.json

**TypeScript:**
- Strict mode enabled
- Explicit return types on exported functions
- Interface over type for object shapes
- No `any` types (use `unknown` if needed)
- `moduleResolution: "bundler"` (supports path aliases)

**Path Aliases:**
- Use `@/*` instead of relative paths
- Maps to `src/*` directory
- NO `.js` extensions in imports
- Examples:
  ```typescript
  import { env } from '@/config/env';
  import { db } from '@/db/client';
  import { users } from '@/db/schema/users';
  import type { User } from '@/db/schema/users';
  ```

**Async/Await:**
- ALWAYS use async/await (never callbacks)
- Error handling with try/catch blocks
- Named error classes extending Error

**Naming Conventions:**
- camelCase for variables and functions
- PascalCase for classes and interfaces
- UPPER_SNAKE_CASE for constants
- kebab-case for file names

**Code Organization:**
- One feature per file/directory
- Export named functions (avoid default exports)
- Keep files under 300 lines
- Use barrel exports (index.ts) for modules

## OAuth & JWT Authentication

### OAuth Flow

**Supported Providers:**
1. **Google Sign-In** - Fully implemented
2. **Apple Sign-In** - Fully implemented (requires paid Apple Developer account)

**Flow Steps:**
1. Client requests OAuth URL: `GET /api/auth/google` or `GET /api/auth/apple`
2. Server returns authorization URL
3. User authenticates with provider (redirect)
4. Provider redirects to callback with authorization code
5. Server exchanges code for user info (Google) or verifies ID token (Apple)
6. Server creates or updates user in database
7. Server checks if user email matches `ADMIN_EMAIL` → auto-promote to admin
8. Server generates JWT access + refresh tokens
9. Client stores tokens and uses access token for subsequent requests

**Auto-Admin Promotion:**
- Set `ADMIN_EMAIL=your-email@gmail.com` in `.env`
- Set `ADMIN_EMAILS_ADDITIONAL=email1@gmail.com,email2@gmail.com` for multiple admins
- When user signs in via OAuth, email is checked against these lists
- If match found, user is automatically promoted to admin role
- Also works for existing users (upgrades user → admin on next login)

### JWT Implementation

**Token Types:**
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

**JWT Payload:**
```typescript
interface JWTPayload {
  id: number;          // User ID
  email: string;       // User email
  role: 'user' | 'admin' | 'superadmin';  // For RBAC
  iat?: number;        // Issued at
  exp?: number;        // Expires at
}
```

**Token Endpoints:**
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `GET /api/auth/verify` - Verify access token
- `POST /api/auth/logout` - Logout (client discards tokens)

### Module Structure

**`src/modules/auth/`:**
- **`auth.types.ts`**: TypeScript interfaces for OAuth, JWT, providers
- **`auth.service.ts`**: OAuth logic (handleGoogleOAuth, handleAppleOAuth, handleOAuthCallback, getGoogleAuthUrl, getAppleAuthUrl)
- **`jwt.service.ts`**: JWT management (generateTokens, verifyToken, refreshAccessToken)
- **`auth.controller.ts`**: Route handlers (handleGoogleLogin, handleGoogleCallback, handleAppleLogin, handleAppleCallback, handleRefreshToken, handleLogout, handleVerifyToken)
- **`auth.routes.ts`**: Fastify route registration with schemas

**`src/plugins/jwt.ts`:**
- Registers `@fastify/jwt` plugin
- Adds `fastify.authenticate` decorator for route protection
- Extends FastifyRequest with typed `user` property

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
user → admin → superadmin
```

**Permissions:**
- **user**: Access own profile, use public endpoints
- **admin**: All user permissions + manage other users, view stats
- **superadmin**: All admin permissions + promote to superadmin, delete superadmins

### Database Schema

```typescript
// src/db/schema/users.ts
export const roleEnum = pgEnum('role', ['user', 'admin', 'superadmin']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar: text('avatar'),
  provider: text('provider').notNull(),  // 'google' | 'apple'
  providerId: text('provider_id').notNull(),
  role: roleEnum('role').notNull().default('user'),  // RBAC role
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Authorization Middleware

**`src/middleware/authorize.ts`** provides these middleware functions:

**`requireAdmin`** - Requires admin or superadmin role
```typescript
fastify.get('/api/admin/users', {
  preHandler: requireAdmin,
  handler: listUsers
});
```

**`requireSuperadmin`** - Requires superadmin role only
```typescript
fastify.patch('/api/admin/promote-superadmin/:id', {
  preHandler: requireSuperadmin,
  handler: promoteSuperadmin
});
```

**`requireRole(allowedRoles)`** - Requires one of specified roles
```typescript
fastify.get('/api/reports', {
  preHandler: requireRole(['admin', 'superadmin']),
  handler: getReports
});
```

**`requireSelfOrAdmin(allowAdmin)`** - Requires user to be themselves or admin
```typescript
fastify.patch('/api/users/:id', {
  preHandler: requireSelfOrAdmin(true),
  handler: updateUser
});
```

**`optionalAuth`** - Attaches user if authenticated, but doesn't require it
```typescript
fastify.get('/api/public-data', {
  preHandler: optionalAuth,
  handler: getPublicData  // request.user may or may not exist
});
```

### Admin Seeding

**Manual Promotion:**
```bash
npm run db:seed
```

This script:
1. Reads `ADMIN_EMAIL` and `ADMIN_EMAILS_ADDITIONAL` from `.env`
2. Finds users by email in database
3. Updates role from `user` to `admin` if not already admin
4. Logs results

**Auto-Promotion:**
- Happens automatically on OAuth login
- Implemented in `src/modules/auth/auth.service.ts` → `handleOAuthCallback()`
- No manual script needed

## API Endpoints Reference

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
| GET | `/api/admin/users` | List all users (with pagination, search, sort) | admin+ |
| GET | `/api/admin/users/stats` | Get user statistics (total, by role, by provider) | admin+ |
| GET | `/api/admin/users/:id` | Get user by ID | admin+ |
| PATCH | `/api/admin/users/:id/role` | Update user role | admin+ (superadmin for superadmin role) |
| DELETE | `/api/admin/users/:id` | Delete user | admin+ (superadmin for superadmin users) |

## Docker Standards

**Single docker-compose.yml Philosophy:**
- ONE compose file for all environments
- Environment differences via .env files
- No docker-compose.dev.yml or docker-compose.prod.yml
- All services defined in single file
- No 'version' field (deprecated in Docker Compose v2.39.4+)

**Dockerfile Requirements:**
- Multi-stage builds MANDATORY
- Non-root user REQUIRED (nodejs:nodejs 1001:1001)
- Health checks on ALL services
- Pinned base images (node:22-alpine, postgres:15-alpine, NEVER :latest)
- .dockerignore includes node_modules, .git, .env

**Container Naming Convention:**
- Use environment variables for container names
- Format: `container_name: ${CONTAINER_SERVICE_NAME}`
- Format: `image: ${CONTAINER_SERVICE_NAME}-img`
- Define in .env: `CONTAINER_POSTGRES_NAME=fastify-oauth-postgres`

**Service Naming:**
- Network: api-network (single custom network)
- Volumes: fastify_oauth_postgres_data, fastify_oauth_redis_data, fastify_oauth_caddy_data

**Resource Limits (Optimized for Raspberry Pi 4B):**
- API: 512MB RAM, 1 CPU
- PostgreSQL: 512MB RAM, 1 CPU
- Redis: 256MB RAM, 0.5 CPU
- Caddy: 256MB RAM, 0.5 CPU
- **Total: ~1.5GB RAM, ~3 CPUs**

## Database Practices

**Drizzle Schema:**
- One schema file per domain (`src/db/schema/*.ts`)
- Always use `timestamp` with timezone
- Index foreign keys automatically
- Use `serial` for auto-increment IDs
- Use `pgEnum` for role-based fields

**Migrations:**
- NEVER edit existing migrations
- Create new migration to modify schema
- Run migrations automatically on container start (can also run manually)
- Keep migrations reversible when possible
- Generate with: `npm run db:generate`
- Apply with: `npm run db:migrate`

**Queries:**
- Use Drizzle ORM query builder
- Raw SQL only for complex queries
- ALWAYS use parameterized statements
- Never string concatenation in queries

**Performance:**
- Connection pooling (min: 2, max: 10)
- Index all foreign keys
- Index frequently-queried columns (email)
- Use EXPLAIN ANALYZE for slow queries

## Security Requirements

**Environment Variables:**
- ALL secrets in .env file (NEVER commit .env)
- Provide .env.example with placeholders
- Use ${VARIABLE} references in docker-compose.yml
- Validate all env vars on startup (using Zod)

**Docker Security:**
- Non-root users in ALL containers
- Resource limits on all services (CPU, memory)
- Health checks for monitoring
- Read-only file systems where possible

**API Security:**
- Rate limiting: 100 requests/minute per IP
- CORS restricted to known origins (production)
- Helmet for security headers
- HTTPS only in production (Caddy handles)
- JWT tokens expire (15m access, 7d refresh)

**Authentication:**
- OAuth tokens validated server-side
- JWT tokens signed with HS256 (configurable)
- Refresh token rotation (can be implemented)
- Secure session cookies (httpOnly, secure, sameSite) if using cookies

## Redis Usage Patterns

**Session Management:**
- Store OAuth tokens (optional, not currently implemented)
- 1-hour TTL for access tokens
- 7-day TTL for refresh tokens
- Automatic cleanup via Redis expiry

**Caching (To Implement):**
- TTL: 5 minutes for API responses
- Key prefix: `fastify:`
- Invalidate on data updates
- Use Redis SCAN for bulk operations

**Pub/Sub (Optional):**
- Channel naming: `fastify:{feature}:{event}`
- JSON payloads only
- Error handling for dropped messages

## Caddy Configuration

**Reverse Proxy:**
- Proxies ALL requests to Fastify API
- Automatic HTTPS via Let's Encrypt
- Health check forwarding to `/health`
- Request/response logging

**Development:**
- Use staging Let's Encrypt (avoid rate limits)
- `CADDY_ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory`
- `CADDY_DOMAIN=localhost`

**Production:**
- Production Let's Encrypt
- `CADDY_ACME_CA=https://acme-v02.api.letsencrypt.org/directory`
- Real domain in `CADDY_DOMAIN`
- Valid email in `CADDY_EMAIL`

## Testing Standards

**Test Framework:**
- Vitest 3.2.4 with V8 coverage provider
- 410 comprehensive tests across 16 test files
- 100% coverage (lines, functions, statements) + 89% branches
- Tests run automatically during Docker build

**Test Structure:**
```
test/
├── helper/                  # Test utilities (setup, factories, app builder)
├── services/                # Unit tests (86 tests)
├── routes/                  # Integration tests (139 tests)
├── middleware/              # Middleware tests (27 tests)
├── utils/                   # Utility tests (62 tests)
├── plugins/                 # Plugin tests (17 tests)
└── app.test.ts              # App tests (10 tests)
```

**Coverage Thresholds (Enforced):**
- **Lines**: 100% ✅
- **Functions**: 100% ✅
- **Statements**: 100% ✅
- **Branches**: 89% (complex conditional logic)

**V8 Ignore Pattern (Best Practice):**
Use `/* v8 ignore next N */` comments for unreachable defensive code:
- Regex validation followed by impossible null checks
- Fastify schema validation followed by runtime checks
- Private method guards called only with valid data
- TypeScript/database constraints preventing nulls

**Example:**
```typescript
const match = exp.match(/^(\d+)([smhdw])$/);
/* v8 ignore next 3 - Unreachable: regex already validates format */
if (!match) {
  throw new Error(`Invalid expiration format: ${exp}`);
}
```

**Database Automation:**
- Test database (`fastify_oauth_db_test`) auto-created during Docker initialization
- No manual setup required
- Migrations run automatically via `test/helper/setup.ts`
- Tables truncated between tests for isolation

**Docker Build Integration:**
- Tests run during multi-stage Docker build (Stage 3: Testing)
- Build fails if any test fails or coverage drops below thresholds
- Ensures production images only built from tested code
- Run manually: `npm run test:coverage`

**Test Best Practices:**
- Test factories for realistic data (`test/helper/factories.ts`)
- Independent tests (no shared state)
- Full request/response cycles for integration tests
- RBAC and security validation (100% coverage)
- Error path testing (catch blocks, database errors)

**For detailed test documentation, see:** [test/README.md](./test/README.md)

**Vitest Config:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {  // Enforced at 100% for production quality
        lines: 100,
        functions: 100,
        branches: 89,
        statements: 100,
      },
    },
  },
});
```

## Critical DO NOTs

❌ **NEVER commit .env files** with real credentials
❌ **NEVER use :latest** Docker tags
❌ **NEVER run containers as root**
❌ **NEVER use 'version' field** in docker-compose.yml (deprecated)
❌ **NEVER hardcode container names** in docker-compose.yml
❌ **NEVER use synchronous I/O** in request handlers
❌ **NEVER concatenate SQL** strings (always parameterize)
❌ **NEVER expose stack traces** in production API responses
❌ **NEVER skip database migrations** (always migrate up/down)
❌ **NEVER hardcode configuration** (use environment variables)
❌ **NEVER create multiple docker-compose files** (use single file + .env)
❌ **NEVER use .js extensions** in TypeScript imports (use path aliases without extensions)

## Critical DOs

✅ **ALWAYS pin dependency versions** (exact in package.json)
✅ **ALWAYS use async/await** (never callbacks)
✅ **ALWAYS validate environment variables** on startup
✅ **ALWAYS include health checks** in Dockerfiles
✅ **ALWAYS use non-root users** in containers
✅ **ALWAYS structure logs as JSON** for aggregation
✅ **ALWAYS handle errors explicitly** (no silent failures)
✅ **ALWAYS use modular scripts-docker/** for management
✅ **ALWAYS test locally before committing** (docker compose up)
✅ **ALWAYS use ${CONTAINER_NAME} variables** for container names in compose
✅ **ALWAYS use path aliases** (`@/*`) instead of relative paths
✅ **ALWAYS use named exports** (avoid default exports)

## Logging Standards

**Format:**
- JSON structured logs (for aggregation)
- Include: timestamp, level, message, context
- Use Pino logger (high performance)

**Levels:**
- `error`: System failures requiring attention
- `warn`: Recoverable issues or deprecations
- `info`: Significant events (startup, shutdown, connections)
- `debug`: Development debugging (off in production)

**Sensitive Data:**
- NEVER log passwords, tokens, or API keys
- Redact email addresses (show only domain) if logging
- Hash user IDs if needed for debugging

## Performance Guidelines

**API Response Times:**
- < 100ms for simple queries
- < 500ms for complex queries
- < 1s for OAuth flows
- Use Redis caching for slow operations

**Database Optimization:**
- Connection pooling (reuse connections)
- Query batching where possible
- Use indexes on foreign keys and email
- Monitor slow query log

**Container Resources:**
- API: 512MB RAM, 1 CPU
- PostgreSQL: 512MB RAM, 1 CPU
- Redis: 256MB RAM, 0.5 CPU
- Caddy: 256MB RAM, 0.5 CPU

## Troubleshooting Quick Reference

**Services won't start:**
```bash
docker compose down -v && docker compose up -d
```

**PostgreSQL connection errors:**
```bash
docker compose exec postgres pg_isready -U postgres
docker compose logs postgres
```

**Redis connection errors:**
```bash
docker compose exec redis redis-cli ping
docker compose logs redis
```

**API not responding:**
```bash
curl http://localhost:3000/health
docker compose logs api
```

**Scripts permission denied:**
```bash
find scripts-docker -name "*.sh" -exec chmod +x {} \;
```

**TypeScript path alias errors:**
```bash
# Check tsconfig.json has:
# - "baseUrl": "."
# - "paths": { "@/*": ["src/*"] }
# - "moduleResolution": "bundler"
npm run type-check
```

## Production Deployment Checklist

Before deploying to production, verify:

- [ ] `NODE_ENV=production` in .env
- [ ] Strong `JWT_SECRET` (min 32 chars random)
- [ ] Strong `DATABASE_PASSWORD` (min 16 chars random)
- [ ] Strong `SESSION_SECRET` (min 32 chars random)
- [ ] Redis password enabled (`REDIS_PASSWORD` set)
- [ ] Real domain in `CADDY_DOMAIN`
- [ ] Production Let's Encrypt in `CADDY_ACME_CA`
- [ ] Valid email in `CADDY_EMAIL`
- [ ] OAuth credentials for production (not dev)
- [ ] `LOG_PRETTY_PRINT=false`
- [ ] `CORS_ORIGIN` with specific domains (not *)
- [ ] `DATABASE_SSL=true` if database is exposed
- [ ] Health checks configured in orchestrator
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Firewall rules configured
- [ ] Log aggregation configured
- [ ] Secrets stored in secret manager (not .env file)
- [ ] `SWAGGER_ENABLED=false` or protect endpoint

## Development Guide

**Getting Started:**
1. Clone repository and copy `.env.example` to `.env`
2. Configure environment variables (see Production Deployment Checklist)
3. Set up OAuth credentials (Google OAuth Console, Apple Developer Portal)
4. Start Docker stack: `npm run docker:start` or `bash scripts-docker/start.sh`
5. Run migrations: `npm run db:migrate`
6. Seed admin users: `npm run db:seed`
7. Test endpoints: `curl http://localhost:3000/health`

**For Raspberry Pi deployment, see [RASPBERRY_PI.md](./RASPBERRY_PI.md)**:
- SWAP configuration for 4GB RAM (`scripts-docker/system/setup-swap.sh`)
- Performance tuning
- Resource monitoring
- Backup strategies

**For comprehensive testing documentation, see [test/README.md](./test/README.md)**:
- Test structure (410 tests)
- Running tests locally
- Coverage reports
- V8 ignore patterns
- Test factories and helpers

## Support Resources

**Official Documentation:**
- Fastify: https://fastify.dev/
- Drizzle ORM: https://orm.drizzle.team/
- Docker Compose: https://docs.docker.com/compose/
- Caddy: https://caddyserver.com/docs/
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- Apple Sign-In: https://developer.apple.com/sign-in-with-apple/

**Community:**
- Fastify Discord: https://discord.gg/fastify
- Stack Overflow: Tag with [fastify] [docker] [oauth]

---

**Last Updated:** October 2025
**Maintainer:** Infrastructure Team
**Version:** 9.0 (Production-Ready OAuth + RBAC + 100% Test Coverage)
