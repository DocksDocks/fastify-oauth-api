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
- Global API key authentication for all routes

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
├── scripts/                     # Utility scripts
│   ├── dev-init.sh              # Complete dev environment setup (services + migrations + seeds)
│   └── test-db/                 # Test database management (create, drop, reset, migrate, setup)
├── frontend/                    # Admin panel (Next.js 16)
│   ├── app/                     # Next.js App Router
│   │   ├── admin/               # Admin routes
│   │   │   ├── layout.tsx       # Admin layout with sidebar
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── login/           # Login page
│   │   │   ├── auth/            # OAuth callback
│   │   │   ├── api-keys/        # API Keys management
│   │   │   ├── collections/     # Database browser
│   │   │   └── authorized-admins/ # Authorized admins (superadmin)
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles with OKLCH theme
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── layout/          # Sidebar component
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── RestrictedAccess.tsx
│   │   │   └── ViewContentModal.tsx
│   │   ├── store/               # Zustand stores
│   │   │   └── auth.ts          # Authentication state
│   │   ├── lib/                 # Utilities
│   │   │   ├── api.ts           # Axios client with interceptors
│   │   │   └── utils.ts         # Helper functions
│   │   └── types/               # TypeScript types
│   │       └── index.ts
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── src/
│   ├── config/                  # Configuration layer
│   │   ├── env.ts               # Environment validation (Zod)
│   │   ├── collections.ts       # Collections browser config
│   │   └── index.ts             # Barrel export
│   ├── db/                      # Database layer
│   │   ├── schema/              # Drizzle schemas
│   │   │   ├── users.ts         # Users table with role enum
│   │   │   ├── api-keys.ts      # Global API keys
│   │   │   ├── seed-status.ts   # Seed tracking
│   │   │   └── index.ts         # Barrel export
│   │   ├── migrations/          # SQL migrations (auto-generated)
│   │   ├── seeds/               # Seed data
│   │   │   ├── index.ts         # Admin seeding script
│   │   │   └── super-admin.ts   # Super admin + API keys seed
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
│   │       ├── users.ts         # User management (list, get, update role, delete, stats)
│   │       ├── api-keys.ts      # API key management (generate, regenerate, revoke)
│   │       └── collections.ts   # Collections browser (read-only DB viewer)
│   ├── plugins/                 # Fastify plugins
│   │   └── jwt.ts               # JWT plugin with authenticate decorator
│   ├── middleware/              # Custom middleware
│   │   ├── authorize.ts         # RBAC middleware (requireAdmin, requireSuperadmin, etc.)
│   │   └── api-key.ts           # Global API key validation
│   ├── utils/                   # Utilities
│   │   ├── logger.ts            # Pino logger setup
│   │   ├── errors.ts            # Custom error classes
│   │   └── response.ts          # Response formatters
│   ├── app.ts                   # Fastify app factory
│   └── server.ts                # Server entry point
├── test/                        # Comprehensive test suite (454 tests, 100% coverage)
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
- [x] Comprehensive test suite (454 tests)
- [x] 100% coverage (lines, functions, statements)
- [x] Unit tests for all services
- [x] Integration tests for all routes
- [x] Middleware and utility tests
- [x] Automated test database setup
- [x] Docker build test validation

### ⏳ Pending Implementation

- [ ] Swagger/OpenAPI documentation

## Development Workflow

**Docker Usage Clarification:**
- **Development**: Run on host machine (`npm run dev`) - enables hot reload and direct code access
- **Services**: Run in Docker containers (PostgreSQL, Redis, Caddy via `docker-compose.yml`)
- **Production**: Entire app runs in Docker container (built via `docker/server/server.Dockerfile`)
- **Testing**: Run on host machine with Docker services available (`npm test`)

**Essential Commands:**
```bash
# First-time setup (recommended for new developers)
npm run dev:init                 # Complete dev environment setup
                                 # - Starts PostgreSQL + Redis
                                 # - Runs migrations on dev database
                                 # - Seeds superadmin + API keys
                                 # - Sets up test database

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
npm run dev                      # Start both API + Admin panel
npm run dev:api                  # Start API only (backend)
npm run dev:frontend             # Start admin panel only (Next.js)

# Database
npm run db:generate              # Generate migrations
npm run db:migrate               # Run migrations
npm run db:studio                # Open Drizzle Studio
npm run db:seed                  # Seed admin users

# Testing
npm test                         # Run tests with Vitest
npm run test:coverage            # Coverage report

# Test Database Management
npm run test:db:setup            # Complete test DB setup (recommended)
npm run test:db:create           # Create test database
npm run test:db:drop             # Drop test database
npm run test:db:reset            # Drop and recreate (clean slate)
npm run test:db:migrate          # Apply migrations to test DB

# Code Quality
npm run lint                     # ESLint
npm run format                   # Prettier
npm run type-check               # TypeScript
```

**IMPORTANT - Command Execution Rules:**
- ❌ **NEVER use `timeout` or `sleep` commands** - They cause delays, block execution, and create unnecessary waiting
- ✅ **Run commands directly** without artificial delays
- ✅ **Use background processes** (`&`) or `run_in_background` parameter if async execution is needed
- ✅ **Check exit codes and outputs** instead of waiting arbitrary time periods

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

**Admin Panel Styling (Next.js + Tailwind CSS v4):**
- ALWAYS use OKLCH theme color variables defined in `frontend/app/globals.css`
- **Colors**: Professional slate/blue palette with WCAG AAA contrast
- **Text Colors**: `text-foreground` (primary text), `text-muted-foreground` (secondary text)
- **Borders**: `border-border` (consistent border colors)
- **Backgrounds**: `bg-background`, `bg-primary`, `bg-secondary`, `bg-muted` with opacity modifiers (e.g., `bg-primary/10`)
- Modern OKLCH color space for perceptual uniformity
- Full light/dark mode support
- Theme colors automatically adapt to system preferences

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
6. Server creates or updates user in database (with auto-promotion if email matches admin list)
7. Server generates JWT access + refresh tokens
8. Client stores tokens and uses access token for subsequent requests

### Multi-Provider Support

**Architecture:**
Users can link multiple OAuth providers (Google + Apple) to a single account using the same email address. The system uses a normalized database design with a separate `provider_accounts` table to manage these relationships.

**Database Schema:**
```typescript
// src/db/schema/provider-accounts.ts
export const providerAccounts = pgTable('provider_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),  // 'google' | 'apple' | 'system'
  providerId: text('provider_id').notNull(),
  email: text('email').notNull(),
  name: text('name'),
  avatar: text('avatar'),
  linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueProviderAccount: unique().on(table.provider, table.providerId),  // Each provider account is unique
  uniqueUserProvider: unique().on(table.userId, table.provider),  // User can only link each provider once
}));

// src/db/schema/users.ts (updated)
export const users = pgTable('users', {
  // ... existing fields ...
  primaryProvider: providerEnum('primary_provider'),  // User's preferred provider
  // Legacy fields (kept for backward compatibility):
  provider: providerEnum('provider').notNull(),
  providerId: text('provider_id').notNull(),
});
```

**Account Linking Flow:**
1. User signs in with OAuth provider (e.g., Google)
2. System checks if `(provider, providerId)` combination exists in `provider_accounts`
3. **If found**: Authenticate user and update `lastLoginAt`
4. **If not found**: Check if email exists with different provider
5. **If email exists**: Return `AccountLinkingRequest` with linking token (10-minute expiry)
6. **If email doesn't exist**: Create new user + provider account
7. **User confirms linking**: Call `POST /api/auth/link-provider` with token
8. **System links accounts**: Create new provider account entry and authenticate

**Account Linking Security:**
- Linking requires explicit user confirmation via frontend modal
- Temporary tokens expire after 10 minutes
- Tokens stored in-memory (Map) with automatic cleanup
- Cannot link if provider already linked to another user
- Cannot link if this provider is already linked to the account

**Provider Management Endpoints:**
- `GET /api/profile/providers` - List all linked providers for authenticated user
- `DELETE /api/profile/providers/:provider` - Unlink a provider (cannot remove last provider)
- `POST /api/auth/link-provider` - Confirm account linking with temporary token

**Provider Accounts Service:**
Located in `src/modules/auth/provider-accounts.service.ts`:
- `getProviderAccount(provider, providerId)` - Look up by provider + providerId
- `getUserProviderAccounts(userId)` - Get all providers for a user
- `createProviderAccount()` - Link new provider to user
- `deleteProviderAccount()` - Unlink provider (prevents unlinking last one)
- `setPrimaryProvider()` - Change user's primary provider
- `hasProviderLinked()` - Check if user has specific provider
- `getUserIdByProvider()` - Get user ID by provider + providerId

**Field Locking:**
To protect authentication integrity, the following fields are read-only in both frontend and backend:
- **Profile API** (`src/routes/profile.ts`): `id`, `email`, `role`, `provider`, `providerId`, `primaryProvider`, `createdAt`, `updatedAt`, `lastLoginAt`
- **Admin Collections** (`src/routes/admin/collections.ts`): Same fields + additional protection for `users` table
- **Frontend** (`frontend/components/EditRecordModal.tsx`): Readonly fields displayed but not editable
- **Collections Config** (`src/config/collections.ts`): Fields marked with `readonly: true` flag

**Data Migration:**
The `0003_migrate_existing_users_to_provider_accounts.sql` migration automatically:
1. Copies existing `(provider, providerId)` from `users` table to `provider_accounts`
2. Sets `primaryProvider` based on existing `provider` field
3. Verifies all users were migrated successfully

**Type Safety:**
```typescript
// src/modules/auth/auth.types.ts
export interface ProviderAccountInfo {
  id: number;
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string | null;
  avatar: string | null;
  linkedAt: string;
  isPrimary: boolean;
}

export interface AccountLinkingRequest {
  linkingToken: string;
  existingUser: {
    id: number;
    email: string;
    name: string | null;
    providers: OAuthProvider[];
  };
  newProvider: {
    provider: OAuthProvider;
    providerId: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
}
```

**Frontend Component:**
The `LinkProviderConfirmation` component (`frontend/components/LinkProviderConfirmation.tsx`) displays:
- Existing account details (email, name, linked providers)
- New provider details (provider, email, name)
- Confirmation/cancel actions
- Error handling with retry support

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
- **`auth.types.ts`**: TypeScript interfaces for OAuth, JWT, providers, multi-provider types
- **`auth.service.ts`**: OAuth logic with multi-provider support (handleOAuthCallback returns User | AccountLinkingRequest, confirmAccountLinking)
- **`provider-accounts.service.ts`**: Provider account management (CRUD operations for linking/unlinking providers)
- **`jwt.service.ts`**: JWT management (generateTokens, verifyToken, refreshAccessToken)
- **`auth.controller.ts`**: Route handlers with account linking support (handleLinkProvider added)
- **`auth.routes.ts`**: Fastify route registration with schemas (includes /api/auth/link-provider)

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
- **admin**: User permissions + manage all users, view all stats, modify any user role
- **superadmin**: All admin permissions + promote to superadmin, delete superadmins, system-wide control

### Database Schema

```typescript
// src/db/schema/users.ts
export const providerEnum = pgEnum('provider', ['google', 'apple', 'system']);
export const roleEnum = pgEnum('role', ['user', 'admin', 'superadmin']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatar: text('avatar'),
  provider: providerEnum('provider').notNull(),  // Legacy field (kept for backward compatibility)
  providerId: text('provider_id').notNull(),  // Legacy field (kept for backward compatibility)
  primaryProvider: providerEnum('primary_provider'),  // User's preferred OAuth provider
  role: roleEnum('role').notNull().default('user'),  // RBAC role
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// src/db/schema/provider-accounts.ts (NEW - Multi-provider support)
export const providerAccounts = pgTable('provider_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),
  providerId: text('provider_id').notNull(),
  email: text('email').notNull(),
  name: text('name'),
  avatar: text('avatar'),
  linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueProviderAccount: unique().on(table.provider, table.providerId),
  uniqueUserProvider: unique().on(table.userId, table.provider),
}));
```

### Authorization Middleware

**`src/middleware/authorize.ts`** provides role-based middleware:

- **`requireAdmin`** - Requires admin or superadmin role
- **`requireSuperadmin`** - Requires superadmin role only
- **`requireRole(allowedRoles)`** - Requires one of specified roles
- **`requireSelfOrAdmin(allowAdmin)`** - Requires user to be themselves or admin
- **`optionalAuth`** - Attaches user if authenticated (doesn't require auth)

**Example Usage:**
```typescript
fastify.get('/api/admin/users', {
  preHandler: requireAdmin,
  handler: listUsers
});

fastify.get('/api/admin/stats', {
  preHandler: requireRole(['admin', 'superadmin']),
  handler: getStats
});
```

### Admin Setup & Seeding

**Auto-Promotion (Recommended):**
Users are automatically promoted to admin role during OAuth login if their email matches:
- `ADMIN_EMAIL` - Primary admin email in `.env`
- `ADMIN_EMAILS_ADDITIONAL` - Comma-separated list of additional admin emails
- Implemented in `src/modules/auth/auth.service.ts` → `handleOAuthCallback()`
- Works for new signups and existing users (upgrades on next login)

**Manual Admin Promotion:**
Promote existing users to admin role:
```bash
npm run db:seed
```
This script reads `ADMIN_EMAIL` and `ADMIN_EMAILS_ADDITIONAL` from `.env`, finds users by email, and updates their role to admin.

**Super Admin Initial Setup:**
1. Set `SUPER_ADMIN_EMAIL` in `.env`:
   ```bash
   SUPER_ADMIN_EMAIL=your-email@gmail.com
   ```

2. Run migrations and super admin seed:
   ```bash
   npm run db:migrate
   npm run db:seed:superadmin
   ```

3. **Important:** Copy the 3 API keys displayed in console:
   - `ios_api_key` - For iOS mobile app
   - `android_api_key` - For Android mobile app
   - `admin_panel_api_key` - For admin web interface

4. Add `admin_panel_api_key` to root `.env` (NEXT_PUBLIC_ prefix required):
   ```bash
   # Add to .env file
   NEXT_PUBLIC_ADMIN_PANEL_API_KEY=<key>
   ```

5. Login via Google OAuth to activate superadmin role:
   - Navigate to `http://localhost:3000/admin` (dev) or `/admin` (prod)
   - Sign in with super admin email
   - Automatically promoted to superadmin role

**Additional Admins/Superadmins:**
- Add emails to `ADMIN_EMAILS_ADDITIONAL` or `SUPER_ADMIN_EMAIL` (comma-separated)
- Or promote via admin panel (future feature)

## Admin Panel

The admin panel is a full-featured web interface for managing the API. It provides a user-friendly way to view statistics, manage API keys, and browse database collections.

### Tech Stack

**Frontend:**
- Next.js 16.0.1 (App Router with server-side rendering)
- React 19 (UI library)
- TypeScript with strict mode
- Path aliases (`@/*` → `src/*`)

**UI & Styling:**
- shadcn/ui component library (headless components with Radix UI)
- TailwindCSS v4 with OKLCH color space
- Modern slate/blue theme with WCAG AAA contrast
- Lucide icons

**State & Data:**
- Zustand for client-side state management
- localStorage persistence for auth state
- Axios for HTTP requests with interceptors
- Next.js App Router for client-side routing

### Features

**1. Dashboard**
- User statistics (total, by role, by provider)
- API key statistics (active, revoked)
- Collection count
- Visual cards with icons and badges

**2. API Keys Management**
- List all API keys with status badges
- Generate new API keys with custom names
- Regenerate existing keys (invalidates old key)
- Revoke keys (soft delete)
- Copy-to-clipboard functionality
- One-time display of plain keys (security best practice)

**3. Collections Browser**
- Read-only database viewer (Strapi-like)
- Manual table configuration in `src/config/collections.ts`
- Pagination (10 records per page)
- Search across searchable columns
- Sort by sortable columns (ascending/descending)
- Dynamic column formatting (timestamps, booleans, JSON, etc.)
- Role badges and status indicators

**4. Authorized Admins Management (Superadmin Only)**
- Pre-authorize emails for automatic admin promotion
- Add/remove authorized admin emails
- View creation history (who added, when)
- Restricted access with role-based UI components

**5. Authentication**
- Google OAuth integration
- Admin/superadmin role requirement
- JWT token management with automatic refresh
- Protected routes with role checking
- Persistent login state

### Architecture

**Layout Components:**
- `Sidebar`: Navigation menu with Next.js Link and usePathname
- `AdminLayout`: Main layout wrapper with sidebar and mobile menu
- All components use 'use client' directive for interactivity

**Pages (Next.js App Router):**
- `/admin/login` - OAuth login with Google/Apple buttons
- `/admin/auth/callback` - Handles OAuth redirect and token exchange
- `/admin` - Dashboard with statistics and overview
- `/admin/api-keys` - API key management interface
- `/admin/collections/[table]` - Database browser with dynamic routes
- `/admin/authorized-admins` - Authorized admins management (superadmin only)

**State Management:**
- `useAuthStore` (Zustand): User, tokens, isAuthenticated
- localStorage persistence for auth state
- SSR checks: `typeof window !== 'undefined'` for browser-only APIs

**API Client:**
- Axios instance with base URL from `NEXT_PUBLIC_API_URL`
- Request interceptor: adds X-API-Key + Authorization headers
- Response interceptor: handles 401 with token refresh
- Helper methods: `authApi`, `adminApi`

### Global API Key Authentication

All API routes (except whitelisted paths) require `X-API-Key` header.

**Whitelisted Paths:**
- `/health` - Health check endpoint
- `/api/auth/*` - OAuth flow endpoints
- `/admin/*` - Admin panel static files

**API Key Setup:**
1. Run super admin seed: `npm run db:seed:superadmin`
2. Copy displayed API keys (only shown once)
3. Add `admin_panel_api_key` to root `.env` (NEXT_PUBLIC_ prefix required):
   ```
   NEXT_PUBLIC_ADMIN_PANEL_API_KEY=your_key_here
   ```
4. Store other keys (`ios_api_key`, `android_api_key`) in mobile apps

**Security:**
- Keys hashed with bcrypt (cost factor 10)
- Plain key shown only once during generation/regeneration
- Keys stored in database with creator tracking
- Soft delete (revokedAt timestamp)

### Production Deployment

**Build Admin Panel:**
```bash
npm run build:frontend
```

This:
1. Runs Next.js build in `frontend/` directory
2. Outputs static files to `frontend/.next/`
3. Fastify serves these files from `/admin` route

**Docker Build:**
The Dockerfile includes a multi-stage build:
- Stage 4: Builds admin panel with Next.js
- Stage 5: Copies built files to production image
- Admin panel served as static files by Fastify

**Access Admin Panel:**
- Development: `http://localhost:3000/admin`
- Production: `https://yourdomain.com/admin`

### Collections Configuration

**Configuration:**
Edit `src/config/collections.ts` to add/modify database tables visible in the admin panel.

**Column Configuration:**
- `name` - Database column name
- `label` - Display label
- `type` - Data type (`text`, `number`, `boolean`, `timestamp`, `json`)
- `sortable` - Enable column sorting
- `searchable` - Include in search queries

**Security:**
- Read-only access (no create/update/delete)
- Manual configuration required (prevents accidental exposure)
- Requires admin/superadmin role

## Environment Variables

**Application:**
- `NODE_ENV` - Environment (development/production)
- `API_URL` - Application URL for OAuth redirects
- `PORT` - Server port (default: 1337)
- `HOST` - Server host (default: 0.0.0.0)

**Database (PostgreSQL):**
- `DATABASE_HOST` - Database host (localhost or postgres service name)
- `DATABASE_PORT` - Database port (default: 5432)
- `DATABASE_USER` - Database username
- `DATABASE_PASSWORD` - Database password (min 16 chars for production)
- `DATABASE_NAME` - Database name
- `DATABASE_SSL` - Enable SSL (true for production if exposed)

**Redis:**
- `REDIS_HOST` - Redis host (localhost or redis service name)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (required for production)
- `REDIS_KEY_PREFIX` - Key prefix (default: fastify:)

**Authentication:**
- `JWT_SECRET` - JWT signing secret (min 32 chars random)
- `JWT_ACCESS_TOKEN_EXPIRATION` - Access token lifetime (default: 15m)
- `JWT_REFRESH_TOKEN_EXPIRATION` - Refresh token lifetime (default: 7d)
- `SESSION_SECRET` - Session secret (min 32 chars random)

**OAuth Providers:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - Google OAuth callback URL
- `APPLE_CLIENT_ID` - Apple OAuth service ID
- `APPLE_TEAM_ID` - Apple Developer Team ID
- `APPLE_KEY_ID` - Apple Sign-In key ID
- `APPLE_REDIRECT_URI` - Apple OAuth callback URL

**Admin Setup:**
- `ADMIN_EMAIL` - Primary admin email for auto-promotion
- `ADMIN_EMAILS_ADDITIONAL` - Additional admin emails (comma-separated)
- `SUPER_ADMIN_EMAIL` - Super admin email(s) for initial setup

**API Keys (Generated via seed script):**
- `IOS_API_KEY` - API key for iOS mobile app (stored in mobile apps)
- `ANDROID_API_KEY` - API key for Android mobile app (stored in mobile apps)
- `NEXT_PUBLIC_ADMIN_PANEL_API_KEY` - API key for admin web interface (NEXT_PUBLIC_ prefix required for Next.js frontend)

**Caddy (Reverse Proxy):**
- `CADDY_DOMAIN` - Domain name (localhost for dev, real domain for prod)
- `CADDY_EMAIL` - Email for Let's Encrypt certificates
- `CADDY_ACME_CA` - ACME CA URL (staging for dev, production for prod)

**Other:**
- `LOG_PRETTY_PRINT` - Pretty print logs (true for dev, false for prod)
- `CORS_ORIGIN` - CORS allowed origins (comma-separated, * for dev only)
- `SWAGGER_ENABLED` - Enable Swagger docs (false or protect in production)

## API Endpoints Reference

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/health` | Health check (returns `{"status":"ok"}`) |
| GET | `/api/auth/google` | Get Google OAuth authorization URL |
| GET | `/api/auth/google/callback` | Google OAuth callback (receives code, returns tokens) |
| GET | `/api/auth/apple` | Get Apple OAuth authorization URL |
| POST | `/api/auth/apple/callback` | Apple OAuth callback (receives code + id_token, returns tokens or account linking request) |
| POST | `/api/auth/link-provider` | Confirm account linking with temporary token (multi-provider support) |
| POST | `/api/auth/refresh` | Refresh access token using refresh token |
| GET | `/api/auth/verify` | Verify access token validity |
| POST | `/api/auth/logout` | Logout (client-side token discard) |

### Protected Endpoints (Require JWT Authentication)

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/profile` | Get current user profile | user+ |
| PATCH | `/api/profile` | Update profile (name, avatar - email/provider locked) | user+ |
| DELETE | `/api/profile` | Delete own account | user+ |
| GET | `/api/profile/providers` | List all linked OAuth providers for user | user+ |
| DELETE | `/api/profile/providers/:provider` | Unlink OAuth provider (cannot remove last one) | user+ |

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
- **Production builds only** - Development runs on host machine (`npm run dev`)
- Multi-stage builds MANDATORY
- Non-root user REQUIRED (nodejs:nodejs 1001:1001)
- Health checks on ALL services
- Pinned base images (node:22-alpine, postgres:15-alpine, NEVER :latest)
- .dockerignore includes node_modules, .git, .env
- NO development or testing stages (services needed, run on host)

**Container Naming Convention:**
- Use environment variables for container names
- Format: `container_name: ${CONTAINER_SERVICE_NAME}`
- Format: `image: ${CONTAINER_SERVICE_NAME}-img`
- Define in .env: `CONTAINER_POSTGRES_NAME=fastify-oauth-postgres`

**Service Naming:**
- Network: api-network (single custom network)
- Volumes: fastify_oauth_postgres_data, fastify_oauth_redis_data, fastify_oauth_caddy_data

**Docker Database & Redis Access:**

**Recommended (npm scripts):**
```bash
npm run docker:postgres:exec     # PostgreSQL psql shell
npm run docker:redis:exec        # Redis CLI
npm run docker:postgres:backup   # Backup database
```

**Alternative methods:**
- Direct docker exec: `docker exec -it fastify-oauth-postgres psql -U postgres -d fastify_oauth_db`
- Via localhost: `psql postgresql://postgres:password@localhost:5432/fastify_oauth_db`
- Container network: Use service names (`postgres`, `redis`) instead of `localhost`

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
- 454 comprehensive tests across 17 test files
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

**Test Database Management:**
- Test database: `fastify_oauth_db_test` (auto-created during Docker initialization)
- Dedicated management scripts in `scripts/test-db/` directory
- **Quick setup**: `npm run test:db:setup` (creates DB + runs migrations + verifies)
- **Clean slate**: `npm run test:db:reset` (drops and recreates database)
- Migrations run automatically via `test/helper/setup.ts` during test execution
- Tables truncated between tests for isolation
- All scripts use Docker exec (no manual psql commands needed)

**Test Database Scripts:**
```bash
npm run test:db:setup    # Complete setup (create + migrate + verify)
npm run test:db:create   # Create test database with extensions
npm run test:db:drop     # Drop test database (terminates connections)
npm run test:db:reset    # Drop and recreate (clean slate)
npm run test:db:migrate  # Apply migrations to test database
```

**Typical Workflow:**
```bash
# 1. Start PostgreSQL container
npm run docker:postgres

# 2. Setup test database (one-time or after schema changes)
npm run test:db:setup

# 3. Run tests
npm test

# 4. After migration changes
npm run test:db:migrate
```

**Testing Workflow (Best Practice):**
- Tests do **NOT** run during Docker build (no service dependencies available)
- Docker build = compile/bundle code only
- Tests = separate step with proper dependencies (PostgreSQL, Redis)

**Local Testing:**
```bash
# 1. Start services
npm run docker:postgres

# 2. Setup test database (one-time or after schema changes)
npm run test:db:setup

# 3. Run tests
npm test

# 4. Build Docker image (after tests pass)
docker build -t fastify-oauth-api .
```

**CI/CD Testing:**
```bash
# 1. Start services (docker-compose or CI services)
# 2. Run tests with coverage: npm run test:coverage
# 3. Build Docker image ONLY if tests pass
# 4. Deploy image
```

**Why Tests Don't Run in Docker Build:**
- Docker build stages are isolated (no PostgreSQL/Redis available)
- Service dependencies required for tests to connect to database
- Separating test + build follows industry best practices
- Faster builds (tests run once in CI/CD, not per build)

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
❌ **NEVER use timeout or sleep commands** in bash commands (causes delays and blocks execution)

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
curl http://localhost:3000/health
docker compose logs api
```

**"API key is required" error:**
1. Ensure `NEXT_PUBLIC_ADMIN_PANEL_API_KEY` is set in root `.env`
2. Rebuild admin panel: `npm run build:frontend`
3. Restart dev server: `npm run dev`

**401 Unauthorized after login:**
1. Check user role in database (must be admin or superadmin)
2. Verify JWT_SECRET matches between requests
3. Check browser localStorage for access_token

**OAuth redirect not working:**
1. Check `GOOGLE_REDIRECT_URI` in backend `.env`
2. Ensure redirect URI matches Google Cloud Console
3. For development, use `http://localhost:3000/api/auth/google/callback`

**Collections not showing data:**
1. Verify table name matches database exactly
2. Check column names in collection config
3. Ensure user has admin/superadmin role

**Test database issues:**
```bash
# Test database doesn't exist
npm run test:db:create

# Migrations not applied to test DB
npm run test:db:migrate

# Schema out of sync (common after migrations)
npm run test:db:reset
npm run test:db:migrate

# Complete reset (recommended for clean slate)
npm run test:db:setup

# Tests fail with "column does not exist"
# Ensure migrations are applied to test database:
npm run test:db:migrate
```

**Test failures after schema changes:**
1. Apply migrations to test database: `npm run test:db:migrate`
2. Or reset test database: `npm run test:db:reset && npm run test:db:migrate`
3. Update test factories if schema changed (test/helper/factories.ts)
4. Update test cases to use new schema fields

**Scripts permission denied:**
```bash
find scripts-docker -name "*.sh" -exec chmod +x {} \;
find scripts -name "*.sh" -exec chmod +x {} \;
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

Before deploying to production, verify (see Environment Variables section for details):

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

**Quick Setup (Recommended):**
1. Clone repository and copy `.env.example` to `.env`
2. Configure environment variables (see Production Deployment Checklist)
3. Set up OAuth credentials (Google OAuth Console, Apple Developer Portal)
4. Initialize development environment: `npm run dev:init`
   - Starts PostgreSQL + Redis containers
   - Runs migrations on development database
   - Seeds superadmin + API keys (copy NEXT_PUBLIC_ADMIN_PANEL_API_KEY to root .env)
   - Sets up test database
5. Start development: `npm run dev`
6. Test endpoints: `curl http://localhost:3000/health`

**Manual Setup (Alternative):**
1-3. Same as above
4. Start services: `npm run docker:postgres` and `npm run docker:redis`
5. Run migrations: `npm run db:migrate`
6. Seed superadmin: `npm run db:seed:superadmin`
7. Setup test database: `npm run test:db:setup`
8. Start development: `npm run dev`

**For comprehensive testing documentation, see [test/README.md](./test/README.md)**:
- Test structure (454 tests)
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

**Last Updated:** November 2025
**Maintainer:** Infrastructure Team
**Version:** 10.0 (Next.js 16 Admin Panel + OKLCH Theme + Production-Ready OAuth + RBAC + 100% Test Coverage)
