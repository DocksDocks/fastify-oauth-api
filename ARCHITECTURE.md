# Architecture Guide

## Tech Stack

### Runtime & Framework
- **Node.js** 22+ LTS (ES Modules only)
- **Fastify** 5.6.1+ (latest v5 ecosystem)
- **TypeScript** 5.9.3+ with strict mode
- **Path aliases** `@/*` → `src/*`

### Infrastructure
- **PostgreSQL** 15-alpine (primary database)
- **Redis** 7-alpine (caching & sessions)
- **Caddy** 2-alpine (reverse proxy + auto HTTPS)
- **Docker** 27.0+ with Compose v2.39.4+

### ORM & Database
- **Drizzle ORM** 0.44.6+ (type-safe SQL)
- **Drizzle Kit** for migrations
- **PostgreSQL native driver**

### Authentication & Authorization
- **OAuth 2.0** (Google + Apple Sign-In)
- **@fastify/jwt** for token management
- **JWT** with role-based access control (RBAC)
- **google-auth-library** for Google OAuth
- **apple-signin-auth** for Apple OAuth
- **Role hierarchy**: user → admin → superadmin
- **Global API key** authentication for all routes

### Frontend (Admin Panel)
- **Next.js** 16.0.1 (App Router with SSR)
- **React** 19 (UI library)
- **TypeScript** with strict mode
- **shadcn/ui** component library (Radix UI)
- **TailwindCSS v4** with OKLCH color space
- **Zustand** for state management
- **Axios** for HTTP requests

## Project Structure (Monorepo)

```
fastify-oauth-api/
├── package.json                 # Root workspace manager (pnpm workspaces)
├── .env                         # Shared environment variables
├── backend/                     # Backend workspace
│   ├── package.json             # Backend dependencies & scripts
│   ├── src/                     # Backend source code
│   │   ├── config/              # Configuration layer
│   │   │   ├── env.ts           # Environment validation (Zod)
│   │   │   ├── collections.ts   # Collections browser config
│   │   │   └── index.ts         # Barrel export
│   │   ├── db/                  # Database layer
│   │   │   ├── schema/          # Drizzle schemas
│   │   │   │   ├── users.ts     # Users with role enum
│   │   │   │   ├── provider-accounts.ts # Multi-provider support
│   │   │   │   ├── api-keys.ts  # Global API keys
│   │   │   │   ├── authorized-admins.ts # Admin whitelist
│   │   │   │   ├── refresh-tokens.ts # JWT refresh tokens
│   │   │   │   ├── collection-preferences.ts # UI preferences
│   │   │   │   ├── user-preferences.ts # User settings
│   │   │   │   ├── setup-status.ts # Setup wizard state
│   │   │   │   └── index.ts     # Barrel export
│   │   │   ├── migrations/      # SQL migrations (auto-generated)
│   │   │   └── client.ts        # DB connection (Drizzle)
│   │   ├── modules/             # Feature modules
│   │   │   └── auth/            # Authentication module
│   │   │       ├── auth.types.ts # OAuth & JWT types
│   │   │       ├── auth.service.ts # OAuth logic
│   │   │       ├── provider-accounts.service.ts # Provider management
│   │   │       ├── jwt.service.ts # JWT management
│   │   │       ├── auth.controller.ts # Route handlers
│   │   │       └── auth.routes.ts # Route registration
│   │   ├── routes/              # API endpoints
│   │   │   ├── health.ts        # Health check endpoint
│   │   │   ├── setup.ts         # Setup wizard routes
│   │   │   ├── profile.ts       # User profile routes
│   │   │   └── admin/           # Admin routes
│   │   │       ├── users.ts     # User management
│   │   │       ├── api-keys.ts  # API key management
│   │   │       ├── collections.ts # Database browser
│   │   │       └── authorized-admins.ts # Admin whitelist
│   │   ├── plugins/             # Fastify plugins
│   │   │   └── jwt.ts           # JWT plugin
│   │   ├── middleware/          # Custom middleware
│   │   │   ├── authorize.ts     # RBAC middleware
│   │   │   └── api-key.ts       # Global API key validation
│   │   ├── utils/               # Utilities
│   │   │   ├── logger.ts        # Pino logger setup
│   │   │   ├── errors.ts        # Custom error classes
│   │   │   └── response.ts      # Response formatters
│   │   ├── app.ts               # Fastify app factory
│   │   └── server.ts            # Server entry point
│   ├── test/                    # Comprehensive test suite (27 files, 644 tests)
│   │   ├── helper/              # Test utilities
│   │   ├── services/            # Unit tests
│   │   ├── routes/              # Integration tests
│   │   ├── middleware/          # Middleware tests
│   │   ├── utils/               # Utility tests
│   │   ├── plugins/             # Plugin tests
│   │   ├── config/              # Config tests
│   │   └── app.test.ts          # App tests
│   ├── tsconfig.json            # Backend TypeScript config
│   ├── drizzle.config.ts        # Drizzle ORM config
│   ├── vitest.config.ts         # Vitest config
│   └── eslint.config.js         # Backend ESLint config
├── frontend/                    # Frontend workspace (Next.js 16)
│   ├── package.json             # Frontend dependencies & scripts
│   ├── app/                     # Next.js App Router
│   │   ├── admin/               # Admin routes
│   │   │   ├── layout.tsx       # Admin layout with sidebar
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── login/           # Login page
│   │   │   ├── auth/            # OAuth callback
│   │   │   ├── api-keys/        # API Keys management
│   │   │   ├── collections/     # Database browser
│   │   │   ├── authorized-admins/ # Authorized admins
│   │   │   ├── setup/           # Setup wizard
│   │   │   └── dev-reset/       # Dev reset tool
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles with OKLCH
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── layout/          # Sidebar component
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── RestrictedAccess.tsx
│   │   │   ├── LinkProviderConfirmation.tsx
│   │   │   └── EditRecordModal.tsx
│   │   ├── store/               # Zustand stores
│   │   │   └── auth.ts          # Authentication state
│   │   ├── lib/                 # Utilities
│   │   │   ├── api.ts           # Axios client with interceptors
│   │   │   └── utils.ts         # Helper functions
│   │   └── types/               # TypeScript types
│   ├── next.config.ts           # Next.js configuration
│   ├── tailwind.config.ts       # TailwindCSS v4 config
│   └── tsconfig.json            # Frontend TypeScript config
├── docker/                      # Shared Docker configurations
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
│   └── server/                  # Fastify app (multi-stage build)
│       └── server.Dockerfile
├── scripts-docker/              # Shared Docker management scripts
│   ├── postgres/                # DB-specific scripts
│   ├── redis/                   # Cache-specific scripts
│   ├── api/                     # API-specific scripts
│   ├── caddy/                   # Proxy-specific scripts
│   ├── system/                  # System-wide scripts
│   └── start.sh                 # Quick start script
├── scripts/                     # Shared utility scripts
│   ├── dev-init.sh              # Complete dev environment setup
│   └── test-db/                 # Test database management
├── keys/                        # OAuth private keys (gitignored)
│   └── AuthKey_*.p8             # Apple Sign-In private key
├── docker-compose.yml           # Service orchestration
├── .env.example                 # Environment template
├── CLAUDE.md                    # Project overview for AI assistants
├── ARCHITECTURE.md              # This file
├── API.md                       # API documentation
├── DOCKER.md                    # Docker guide
├── DEVELOPMENT.md               # Development guide
├── DEPLOYMENT.md                # Deployment guide
└── README.md                    # Quick start
```

## Database Schema Overview

### Core Tables
- **users** - User accounts with role-based access
- **provider_accounts** - Multi-provider OAuth linking (Google, Apple)
- **refresh_tokens** - JWT refresh token storage
- **api_keys** - Global API keys for client authentication

### Admin Management
- **authorized_admins** - Pre-authorized admin emails
- **collection_preferences** - UI table preferences (sorting, columns)
- **user_preferences** - User-specific settings

### System Tables
- **setup_status** - Setup wizard state tracking

### Schema Features
- **Multi-provider support** via normalized provider_accounts table
- **Role hierarchy** via enum: user → admin → superadmin
- **Provider enum** for OAuth: 'google' | 'apple' | 'system'
- **Auto-timestamps** with timezone support
- **Foreign key constraints** with cascade deletes
- **Unique constraints** for data integrity

## Code Style Standards

### Module System
- ES modules exclusively (`import`/`export`)
- No CommonJS (`require`/`module.exports`)
- `"type": "module"` in package.json

### TypeScript
- Strict mode enabled
- Explicit return types on exported functions
- Interface over type for object shapes
- No `any` types (use `unknown` if needed)
- `moduleResolution: "bundler"` (supports path aliases)

### Path Aliases
Use `@/*` instead of relative paths:
```typescript
import { env } from '@/config/env';
import { db } from '@/db/client';
import { users } from '@/db/schema/users';
import type { User } from '@/db/schema/users';
```

**Rules:**
- Maps to `src/*` directory
- NO `.js` extensions in imports
- Always prefer path aliases over relative paths

### Async/Await
- ALWAYS use async/await (never callbacks)
- Error handling with try/catch blocks
- Named error classes extending Error

### Naming Conventions
- **camelCase** for variables and functions
- **PascalCase** for classes and interfaces
- **UPPER_SNAKE_CASE** for constants
- **kebab-case** for file names

### Code Organization
- One feature per file/directory
- Export named functions (avoid default exports)
- Keep files under 300 lines
- Use barrel exports (index.ts) for modules

### Admin Panel Styling
Use OKLCH theme color variables from `frontend/app/globals.css`:
- **Text**: `text-foreground`, `text-muted-foreground`
- **Borders**: `border-border`
- **Backgrounds**: `bg-background`, `bg-primary`, `bg-secondary`, `bg-muted`
- **Opacity modifiers**: `bg-primary/10`, `bg-secondary/20`
- Modern OKLCH color space for perceptual uniformity
- Full light/dark mode support with WCAG AAA contrast

## Architecture Patterns

### Modular Structure
- **Feature-based modules** in `backend/src/modules/` (e.g., auth/)
- **Route handlers** in `backend/src/routes/` (grouped by feature)
- **Shared utilities** in `backend/src/utils/`
- **Middleware** in `backend/src/middleware/`
- **Plugins** in `backend/src/plugins/`

### Authentication Module
```
backend/src/modules/auth/
├── auth.types.ts           # Type definitions
├── auth.service.ts         # OAuth business logic
├── provider-accounts.service.ts # Provider CRUD
├── jwt.service.ts          # JWT operations
├── auth.controller.ts      # Request handlers
└── auth.routes.ts          # Route registration
```

### Dependency Flow
```
server.ts → app.ts → plugins → middleware → routes → modules → db
```

### Error Handling
- Custom error classes in `backend/src/utils/errors.ts`
- Fastify error handler for consistent responses
- Structured logging with Pino
- No stack traces in production responses

### Environment Validation
- Zod schemas in `backend/src/config/env.ts`
- Validates all env vars on startup
- Type-safe access via `env` export
- Fails fast on invalid configuration

### OAuth Keys Management

**Keys Directory Structure:**
```
keys/
└── AuthKey_*.p8    # Apple Sign-In private key (.p8 format)
```

**Purpose:**
- Stores OAuth provider private keys (currently Apple Sign-In)
- Separate from application code for security best practices
- Mounted read-only in Docker: `./keys:/app/keys:ro`

**Security Considerations:**
- ✅ Never commit `.p8` files to Git (protected by `.gitignore`)
- ✅ Files have restricted permissions: `chmod 600`
- ✅ Directory kept at root level (deployment artifact, not code)
- ✅ In production, use secret management services (AWS Secrets Manager, Vault)
- ⚠️ Apple private keys are shown only once during generation

**Environment Variables:**
```bash
# Apple Sign-In Configuration
APPLE_CLIENT_ID=com.yourdomain.service    # Service ID
APPLE_TEAM_ID=ABCDEF1234                  # 10-char Team ID
APPLE_KEY_ID=ABCDEF1234                   # 10-char Key ID
APPLE_PRIVATE_KEY_PATH=./keys/AuthKey_*.p8 # Path to .p8 file
```

**Docker Integration:**
- Volume mount in `docker-compose.yml`: `./keys:/app/keys:ro`
- Read-only mount prevents accidental modifications
- Keys accessible to backend at runtime via `APPLE_PRIVATE_KEY_PATH`

**For detailed OAuth setup instructions, see [DEVELOPMENT.md](./DEVELOPMENT.md#oauth-setup)**

## Database Practices

### Drizzle Schema
- One schema file per domain
- Always use `timestamp` with timezone
- Index foreign keys automatically
- Use `serial` for auto-increment IDs
- Use `pgEnum` for constrained fields

### Migrations
- NEVER edit existing migrations
- Generate with: `pnpm db:generate`
- Apply with: `pnpm db:migrate`
- Keep migrations reversible when possible
- Auto-generated SQL in `backend/src/db/migrations/`

### Queries
- Use Drizzle ORM query builder
- Raw SQL only for complex queries
- ALWAYS use parameterized statements
- Never string concatenation in queries

### Performance
- Connection pooling (min: 2, max: 10)
- Index all foreign keys
- Index frequently-queried columns (email)
- Use EXPLAIN ANALYZE for slow queries

## Testing Architecture

### Test Structure
```
backend/test/
├── helper/          # Setup, factories, app builder
├── services/        # Unit tests for business logic
├── routes/          # Integration tests for API
├── middleware/      # Middleware tests
├── utils/           # Utility tests
├── plugins/         # Plugin tests
├── config/          # Configuration tests
└── app.test.ts      # Application tests
```

### Test Database
- Separate test database: `fastify_oauth_db_test`
- Managed via scripts in `scripts/test-db/` (root directory)
- Migrations applied automatically during tests
- Tables truncated between tests for isolation

### Coverage
- **Vitest** with V8 coverage provider
- **93.4%** lines and statements ✅
- **100%** functions ✅
- **84.72%** branches
- **644 tests** across **27 test files**
- Coverage thresholds enforced in vitest.config.ts

### Test Patterns
- Test factories for realistic data
- Independent tests (no shared state)
- Full request/response cycles
- RBAC and security validation
- Error path testing

## Security Architecture

### Authentication Layers
1. **Global API Key** - All routes (except whitelisted)
2. **JWT Access Token** - User authentication (15min)
3. **JWT Refresh Token** - Token renewal (7 days)
4. **RBAC Middleware** - Role-based authorization

### OAuth Flow Security
- State parameter validation (CSRF protection)
- Token exchange server-side only
- No tokens in URLs or client storage
- Secure cookie options (httpOnly, secure, sameSite)

### API Key Security
- Bcrypt hashing (cost factor 10)
- Plain key shown only once
- Soft delete (revokedAt timestamp)
- Creator tracking for audit

### Field Locking
Read-only fields in both frontend and backend:
- `id`, `email`, `role`, `provider`, `providerId`
- `primaryProvider`, `createdAt`, `updatedAt`, `lastLoginAt`
- Prevents authentication integrity issues

## Logging Standards

### Format
- JSON structured logs for aggregation
- Include: timestamp, level, message, context
- Use Pino logger (high performance)

### Levels
- **error** - System failures requiring attention
- **warn** - Recoverable issues or deprecations
- **info** - Significant events (startup, shutdown)
- **debug** - Development debugging (off in production)

### Sensitive Data
- NEVER log passwords, tokens, or API keys
- Redact email addresses (show only domain)
- Hash user IDs if needed for debugging

## Performance Guidelines

### API Response Times
- < 100ms for simple queries
- < 500ms for complex queries
- < 1s for OAuth flows
- Use Redis caching for slow operations

### Database Optimization
- Connection pooling (reuse connections)
- Query batching where possible
- Use indexes on foreign keys and email
- Monitor slow query log

---

**See also:**
- [API.md](./API.md) - API endpoints and authentication
- [DOCKER.md](./DOCKER.md) - Docker configuration
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
