# Fastify v5 OAuth API

Production-ready Fastify v5 OAuth API with PostgreSQL, Redis, Next.js admin panel, and comprehensive testing (100% coverage). Features multi-provider authentication (Google + Apple), JWT tokens, role-based access control, and Docker orchestration following 2025 best practices.

## Features

- **OAuth 2.0 Authentication**: Google + Apple Sign-In with multi-provider account linking
- **JWT Tokens**: Access tokens (15min) + refresh tokens (7 days) with rotation
- **Role-Based Access Control**: 3-tier hierarchy (user → admin → superadmin)
- **Admin Panel**: Next.js 16 dashboard with API key management and database browser
- **Global API Keys**: Secure API access with bcrypt-hashed keys
- **Comprehensive Testing**: Vitest with 100% coverage (lines/functions/statements)
- **Docker Infrastructure**: PostgreSQL, Redis, Caddy reverse proxy with auto-HTTPS
- **Code Quality**: TypeScript strict mode, ESLint, Prettier, Husky git hooks

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
- Multi-stage Dockerfiles | Non-root containers
- Modular scripts-docker/ architecture

## Quick Start

### Prerequisites

- Docker 27.0+ and Docker Compose v2.39.4+
- Node.js 22+ (for local development)
- pnpm 10.21.0+ (package manager)

### Setup

1. **Install pnpm (if not already installed):**
   ```bash
   npm install --global corepack@latest
   corepack enable pnpm
   corepack use pnpm@latest
   pnpm -v  # Verify installation (should show 10.21.0+)
   ```

2. **Clone and configure:**
   ```bash
   git clone <repository-url>
   cd fastify-oauth-api
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Initialize development environment:**
   ```bash
   pnpm dev:init
   ```
   This will:
   - Start PostgreSQL + Redis containers
   - Run migrations on development database
   - Initialize setup wizard (generates API keys)
   - Set up test database

5. **Start development:**
   ```bash
   pnpm dev
   ```
   - API: http://localhost:1337
   - Admin Panel: http://localhost:3000/admin
   - Health check: http://localhost:1337/health

## Essential Commands

**Development:**
```bash
pnpm dev              # Start API + admin panel
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
pnpm db:migrate       # Run migrations
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
├── package.json         # Root workspace manager (pnpm workspaces)
├── pnpm-workspace.yaml  # pnpm workspace configuration
├── pnpm-lock.yaml       # Dependency lock file
├── .env                 # Shared environment variables
├── backend/             # Backend workspace
│   ├── package.json     # Backend dependencies & scripts
│   ├── src/             # Backend source code
│   │   ├── config/      # Environment validation (Zod)
│   │   ├── db/          # Drizzle schemas + migrations
│   │   ├── modules/     # Feature modules (auth)
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # RBAC, API key validation
│   │   ├── plugins/     # Fastify plugins (JWT)
│   │   └── utils/       # Logger, errors, response
│   ├── test/            # Backend test suite (13 files)
│   ├── tsconfig.json    # Backend TypeScript config
│   ├── drizzle.config.ts # Drizzle ORM config
│   ├── vitest.config.ts  # Vitest config
│   └── eslint.config.js  # Backend ESLint config
├── frontend/            # Frontend workspace (Next.js 16)
│   ├── package.json     # Frontend dependencies & scripts
│   ├── app/             # Next.js App Router pages
│   └── src/             # Components, store, lib, types
├── docker/              # Shared Docker configurations
│   ├── database/        # PostgreSQL Dockerfile & configs
│   ├── redis/           # Redis Dockerfile & configs
│   ├── server/          # API Dockerfile (multi-stage)
│   └── caddy/           # Caddy Dockerfile & Caddyfile
├── scripts-docker/      # Shared Docker management scripts
├── scripts/             # Shared utility scripts (dev-init, test-db)
├── keys/                # OAuth private keys (gitignored)
├── docker-compose.yml   # Service orchestration
└── *.md                 # Documentation files
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/apple` | Initiate Apple OAuth |
| POST | `/api/auth/apple/callback` | Apple OAuth callback |
| POST | `/api/auth/link-provider` | Confirm account linking |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/verify` | Verify access token |
| POST | `/api/auth/logout` | Logout user |

### Protected Endpoints (JWT Required)

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/profile` | Get user profile | user+ |
| PATCH | `/api/profile` | Update profile | user+ |
| DELETE | `/api/profile` | Delete account | user+ |
| GET | `/api/profile/providers` | List linked providers | user+ |
| DELETE | `/api/profile/providers/:provider` | Unlink provider | user+ |

### Admin Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | List all users | admin+ |
| GET | `/api/admin/users/stats` | User statistics | admin+ |
| GET | `/api/admin/users/:id` | Get user by ID | admin+ |
| PATCH | `/api/admin/users/:id/role` | Update user role | admin+ |
| DELETE | `/api/admin/users/:id` | Delete user | admin+ |
| GET | `/api/admin/api-keys` | List API keys | admin+ |
| POST | `/api/admin/api-keys` | Generate API key | admin+ |
| DELETE | `/api/admin/api-keys/:id` | Revoke API key | admin+ |
| GET | `/api/admin/collections/:table` | Browse database | admin+ |
| GET | `/api/admin/authorized-admins` | List authorized admins | superadmin |
| POST | `/api/admin/authorized-admins` | Add authorized admin | superadmin |

### Setup Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/setup/status` | Get setup status |
| POST | `/api/setup/initialize` | Initialize system |
| POST | `/api/setup/reset` | Reset setup (dev only) |

## Admin Panel Features

- **Dashboard**: User statistics, API key stats, collection count, visual cards
- **API Keys**: Generate, regenerate, revoke, copy-to-clipboard, one-time display
- **Collections Browser**: Read-only database viewer with pagination, search, sort
- **Authorized Admins**: Pre-authorize emails for auto-admin promotion (superadmin only)
- **Setup Wizard**: Initial system configuration, generates API keys, creates superadmin

**Access:**
- Development: http://localhost:3000/admin
- Production: https://yourdomain.com/admin

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:1337/api/auth/google/callback` (dev) or your domain (prod)
4. Copy Client ID and Secret to `.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:1337/api/auth/google/callback
   ```

### Apple Sign-In

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Create Service ID
3. Generate private key (.p8)
4. Save private key to `./keys/AuthKey_XXXXXXXXXX.p8`
5. Copy Team ID, Key ID, Client ID to `.env`:
   ```
   APPLE_CLIENT_ID=com.yourdomain.service
   APPLE_TEAM_ID=ABCDEF1234
   APPLE_KEY_ID=ABCDEF1234
   APPLE_REDIRECT_URI=http://localhost:1337/api/auth/apple/callback
   ```

## Testing

**Framework:** Vitest 3.2.4 with V8 coverage provider

**Coverage:**
- Lines: 100% ✅
- Functions: 100% ✅
- Statements: 100% ✅
- Branches: 89%

**Test Files:** 13 files covering services, routes, middleware, utils, plugins, config

**Test Database:**
- Separate database: `fastify_oauth_db_test`
- Managed via `scripts/test-db/` scripts
- Tables truncated between tests
- Migrations applied automatically

**Commands:**
```bash
pnpm test             # Run all tests
pnpm test:coverage    # Coverage report
pnpm test:db:setup    # Setup test DB (create + migrate)
pnpm test:db:reset    # Drop and recreate test DB
```

See [backend/test/README.md](./backend/test/README.md) for comprehensive testing guide.

## Security

- **Global API Key**: Required for all routes (except whitelisted paths)
- **JWT Tokens**: Access (15min) + Refresh (7 days) with rotation
- **OAuth Security**: State parameter validation, server-side token exchange
- **Password Hashing**: Bcrypt with cost factor 10 for API keys
- **Rate Limiting**: 100 requests/minute per IP
- **Security Headers**: Helmet for CORS, CSP, HSTS
- **Docker Security**: Non-root users, resource limits, health checks

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide.

**Quick checklist:**
- [ ] `NODE_ENV=production` in .env
- [ ] Strong secrets (JWT_SECRET, DATABASE_PASSWORD, SESSION_SECRET)
- [ ] Redis password enabled
- [ ] Real domain in CADDY_DOMAIN
- [ ] Production Let's Encrypt in CADDY_ACME_CA
- [ ] OAuth credentials for production
- [ ] `LOG_PRETTY_PRINT=false`
- [ ] `CORS_ORIGIN` with specific domains
- [ ] Health checks, monitoring, backups configured

## Documentation

Comprehensive documentation split by topic:

- **[CLAUDE.md](./CLAUDE.md)** - Project overview for AI assistants
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Project structure, tech stack, code style standards
- **[API.md](./API.md)** - API endpoints, OAuth flows, authentication, RBAC
- **[DOCKER.md](./DOCKER.md)** - Docker configuration, services, management scripts
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow, testing, troubleshooting
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment, environment variables, security
- **[test/README.md](./test/README.md)** - Comprehensive testing guide

## Troubleshooting

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
curl http://localhost:1337/health
docker compose logs api
```

**Permission denied on scripts:**
```bash
find scripts-docker -name "*.sh" -exec chmod +x {} \;
find scripts -name "*.sh" -exec chmod +x {} \;
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for more troubleshooting tips.

## Support Resources

**Official Documentation:**
- [Fastify](https://fastify.dev/) | [Drizzle ORM](https://orm.drizzle.team/) | [Docker Compose](https://docs.docker.com/compose/)
- [Next.js](https://nextjs.org/docs) | [Vitest](https://vitest.dev/) | [Caddy](https://caddyserver.com/docs/)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2) | [Apple Sign-In](https://developer.apple.com/sign-in-with-apple/)

**Community:**
- [Fastify Discord](https://discord.gg/fastify)
- Stack Overflow: [fastify] [docker] [oauth]

---

**Version:** 13.0 (Monorepo with pnpm Workspaces + Production-Ready OAuth + RBAC + 100% Test Coverage)
**Last Updated:** November 2025
**License:** MIT
