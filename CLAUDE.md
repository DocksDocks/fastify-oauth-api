# Fastify v5 OAuth API - Project Overview

Production-ready OAuth 2.0 API with Fastify v5, PostgreSQL, Redis, and Next.js admin panel. Features multi-provider authentication (Google + Apple), JWT tokens, role-based access control, and comprehensive testing (93.4% coverage, 644 tests).

## Quick Start

```bash
# 1. Clone and configure
git clone <repository-url>
cd fastify-oauth-api
cp .env.example .env
# Edit .env with your credentials

# 2. Install pnpm (if not already installed)
npm install --global corepack@latest
corepack enable pnpm
corepack use pnpm@latest

# 3. Install dependencies
pnpm install

# 4. Initialize development environment
pnpm dev:init
# Starts PostgreSQL + Redis, runs migrations, sets up databases

# 5. Start development
pnpm dev
# API: http://localhost:1337
# Admin Panel: http://localhost:3000/admin
```

## Tech Stack

**Backend:**
- Node.js 22+ (ES Modules) | pnpm 10.21.0+ | Fastify 5.6.1+ | TypeScript 5.9.3+
- PostgreSQL 15 | Redis 7 | Drizzle ORM 0.44.6+
- OAuth 2.0 (Google + Apple) | JWT + RBAC
- Docker 27.0+ with Compose v2.39.4+

**Frontend (Admin Panel):**
- Next.js 16.0.1 (App Router) | React 19 | TypeScript
- shadcn/ui + Radix UI | TailwindCSS v4 (OKLCH colors)
- Zustand state management | Axios

**Infrastructure:**
- Caddy 2 (reverse proxy + auto HTTPS)
- Modular scripts-docker/ architecture
- Multi-stage Dockerfiles
- Non-root containers with resource limits

## Features

### ✅ Implemented
- **Authentication**: OAuth 2.0 (Google + Apple), multi-provider account linking, JWT tokens (15min access + 7day refresh)
- **Authorization**: RBAC with 3 roles (user → admin → superadmin), auto-promotion, authorized admins management
- **API Security**: Global API key authentication, rate limiting (100 req/min), CORS, Helmet, bcrypt hashing
- **Admin Panel**: Dashboard with stats, API key management, database browser, collections config, setup wizard
- **Database**: Drizzle ORM, auto-migrations, provider accounts, refresh tokens, user/collection preferences
- **Infrastructure**: Docker orchestration, PostgreSQL + Redis with persistence, Caddy reverse proxy, health checks
- **Testing**: Vitest with V8 coverage (93.4% lines/statements, 100% functions, 84.72% branches), 27 test files, 644 tests, test database management
- **Code Quality**: TypeScript strict mode, ESLint + Prettier, Husky git hooks, path aliases, structured logging (Pino)

### ⏳ Pending
- Swagger/OpenAPI documentation

## Essential Commands

**Development:**
```bash
pnpm dev              # Start API + admin panel (auto-runs migrations)
pnpm dev:api          # Start API only (backend)
pnpm dev:frontend     # Start admin panel only
pnpm dev:init         # Complete dev setup
```

**Docker Services:**
```bash
pnpm docker:start     # Start all services
pnpm docker:stop      # Stop all services
pnpm docker:health    # Check service health
pnpm docker:postgres  # Start PostgreSQL
pnpm docker:redis     # Start Redis
```

**Database:**
```bash
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations (drizzle-kit)
pnpm db:migrate:auto  # Run migrations programmatically (auto-runs with pnpm dev)
pnpm db:studio        # Open Drizzle Studio GUI
```

**Testing:**
```bash
pnpm test             # Run tests
pnpm test:coverage    # Coverage report
pnpm test:db:setup    # Setup test database
```

**Code Quality:**
```bash
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm type-check       # TypeScript
```

## Project Structure (Monorepo)

```
fastify-oauth-api/
├── package.json         # Root workspace manager
├── .env                 # Shared environment variables
├── backend/             # Backend workspace
│   ├── package.json     # Backend dependencies
│   ├── src/             # Backend source code
│   │   ├── config/      # Environment validation (Zod)
│   │   ├── db/          # Drizzle schemas + migrations
│   │   ├── modules/     # Feature modules (auth)
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # RBAC, API key validation
│   │   ├── plugins/     # Fastify plugins (JWT)
│   │   └── utils/       # Logger, errors, response
│   ├── test/            # Backend test suite
│   ├── tsconfig.json    # Backend TS config
│   ├── drizzle.config.ts # Drizzle ORM config
│   ├── vitest.config.ts  # Vitest config
│   └── eslint.config.js  # Backend ESLint
├── frontend/            # Frontend workspace (Next.js 16)
│   ├── package.json     # Frontend dependencies
│   ├── app/             # App Router pages
│   └── src/             # Components, store, lib
├── docker/              # Shared Docker configs
│   ├── database/        # PostgreSQL
│   ├── redis/           # Redis
│   ├── server/          # Fastify app
│   └── caddy/           # Reverse proxy
├── scripts-docker/      # Shared Docker management scripts
├── scripts/             # Shared utility scripts (dev-init, test-db)
├── keys/                # OAuth private keys (gitignored)
└── *.md                 # Documentation files
```

## Database Schema

**Core Tables:**
- `users` - User accounts with role enum
- `provider_accounts` - Multi-provider OAuth linking
- `refresh_tokens` - JWT refresh token storage
- `api_keys` - Global API keys (bcrypt hashed)

**Admin Management:**
- `authorized_admins` - Pre-authorized admin emails
- `collection_preferences` - UI table preferences
- `user_preferences` - User settings

**System:**
- `setup_status` - Setup wizard state

## Authentication & Authorization

**OAuth Flow:**
1. Request OAuth URL → 2. User authenticates → 3. Callback with code → 4. Exchange for tokens → 5. Create/update user → 6. Return JWT tokens

**Multi-Provider Support:**
- Users can link Google + Apple to single account
- Account linking requires user confirmation (10min token expiry)
- Provider management endpoints for linking/unlinking

**RBAC Hierarchy:**
```
user → admin → superadmin
```

**Authorization Middleware:**
- `requireAdmin` - Admin or superadmin
- `requireSuperadmin` - Superadmin only
- `requireRole(['role1', 'role2'])` - Any of specified roles
- `requireSelfOrAdmin` - User is themselves or admin
- `optionalAuth` - Optional authentication

**JWT Tokens:**
- Access: 15 minutes (API requests)
- Refresh: 7 days (token renewal)
- Payload: `{ id, email, role, iat, exp }`

**Global API Key:**
- Required for all routes (except `/health`, `/api/auth/*`, `/api/setup/*`, `/admin/*`)
- Three keys generated during setup: iOS, Android, Admin Panel
- Bcrypt hashed (cost factor 10)

## Code Style Standards

**Module System:**
- ES modules only (`import`/`export`)
- `"type": "module"` in package.json

**TypeScript:**
- Strict mode enabled
- Explicit return types on exported functions
- No `any` types (use `unknown` if needed)

**Path Aliases:**
```typescript
import { env } from '@/config/env';      // Use @/*
import { db } from '@/db/client';        // Never relative paths
import { users } from '@/db/schema/users';
```

**Naming:**
- camelCase: variables, functions
- PascalCase: classes, interfaces
- UPPER_SNAKE_CASE: constants
- kebab-case: file names

**Admin Panel:**
- Use OKLCH theme variables from `frontend/app/globals.css`
- `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-primary`, `border-border`
- Full light/dark mode with WCAG AAA contrast

## Critical DO NOTs

❌ NEVER commit .env files
❌ NEVER use :latest Docker tags
❌ NEVER run containers as root
❌ NEVER use synchronous I/O in request handlers
❌ NEVER concatenate SQL strings (always parameterize)
❌ NEVER expose stack traces in production
❌ NEVER skip database migrations
❌ NEVER hardcode configuration
❌ NEVER use .js extensions in TypeScript imports
❌ NEVER use timeout/sleep commands in bash

## Critical DOs

✅ ALWAYS pin dependency versions
✅ ALWAYS use async/await (never callbacks)
✅ ALWAYS validate environment variables on startup
✅ ALWAYS include health checks in Dockerfiles
✅ ALWAYS use non-root users in containers
✅ ALWAYS structure logs as JSON
✅ ALWAYS handle errors explicitly
✅ ALWAYS test locally before committing
✅ ALWAYS use path aliases (@/*)
✅ ALWAYS use named exports

## Admin Panel Features

**Dashboard:** User stats, API key stats, collection count, visual cards

**API Keys:** List, generate, regenerate, revoke, copy-to-clipboard, one-time display

**Collections Browser:** Read-only database viewer with pagination, search, sort, dynamic formatting

**Authorized Admins:** Pre-authorize emails for auto-promotion (superadmin only)

**Setup Wizard:** Initial system configuration, generates API keys, creates superadmin

**Dev Reset:** Reset setup status (dev mode only)

**Access:**
- Development: http://localhost:3000/admin
- Production: https://yourdomain.com/admin

## Testing

**Framework:** Vitest 3.2.4 with V8 coverage provider

**Coverage:**
- Lines: 93.4% ✅
- Functions: 100% ✅
- Statements: 93.4% ✅
- Branches: 84.72%

**Test Suite:** 644 tests across 27 test files

**Test Database:**
- Separate database: `fastify_oauth_db_test`
- Managed via `scripts/test-db/` directory
- Tables truncated between tests
- Migrations applied automatically

**Commands:**
```bash
pnpm test             # Run all tests
pnpm test:coverage    # Coverage report
pnpm test:db:setup    # Setup test DB (create + migrate)
pnpm test:db:reset    # Drop and recreate
```

See [backend/test/README.md](./backend/test/README.md) for comprehensive testing guide.

## Docker Standards

**Single docker-compose.yml Philosophy:**
- ONE compose file for all environments
- Environment differences via .env files
- No version field (deprecated)

**Development vs Production:**
- Development: Run on host (`pnpm dev`) - hot reload
- Services: Run in Docker (PostgreSQL, Redis, Caddy)
- Production: Entire app in Docker container
- Testing: Run on host with Docker services

**Security:**
- Non-root users in ALL containers
- Resource limits (CPU, memory)
- Health checks on all services
- Pinned base images (never :latest)

## Documentation

Comprehensive documentation split by topic:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Project structure, tech stack, code style standards
- **[API.md](./API.md)** - API endpoints, OAuth flows, authentication, RBAC
- **[DOCKER.md](./DOCKER.md)** - Docker configuration, services, management scripts
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow, testing, troubleshooting
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment, environment variables, security
- **[test/README.md](./test/README.md)** - Comprehensive testing guide

## Support Resources

**Official Docs:**
- [Fastify](https://fastify.dev/) | [Drizzle ORM](https://orm.drizzle.team/) | [Docker Compose](https://docs.docker.com/compose/)
- [Next.js](https://nextjs.org/docs) | [Vitest](https://vitest.dev/) | [Caddy](https://caddyserver.com/docs/)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2) | [Apple Sign-In](https://developer.apple.com/sign-in-with-apple/)

**Community:**
- [Fastify Discord](https://discord.gg/fastify)
- Stack Overflow: [fastify] [docker] [oauth]

---

**Version:** 14.0 (Monorepo with pnpm Workspaces + Restructured Documentation + RBAC + 93.4% Test Coverage + 644 Tests)
**Last Updated:** November 2025
**Maintainer:** Infrastructure Team
