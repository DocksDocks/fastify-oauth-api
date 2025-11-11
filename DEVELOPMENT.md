# Development Guide

## Getting Started

### Quick Setup (Recommended)

1. **Clone and configure:**
   ```bash
   git clone <repository-url>
   cd fastify-oauth-api
   cp .env.example .env
   ```

2. **Configure environment variables** in `.env`:
   - Database credentials
   - Redis password
   - JWT secrets
   - OAuth credentials (Google, Apple)
   - Admin emails

3. **Set up OAuth credentials:**
   - Google: [Google Cloud Console](https://console.cloud.google.com/)
   - Apple: [Apple Developer Portal](https://developer.apple.com/)

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

### Manual Setup (Alternative)

1-3. Same as above

4. **Start services:**
   ```bash
   pnpm docker:postgres
   pnpm docker:redis
   ```

5. **Run migrations:**
   ```bash
   pnpm db:migrate
   ```

6. **Setup test database:**
   ```bash
   ppnpm test:db:setup
   ```

7. **Start development:**
   ```bash
   pnpm dev
   ```

## OAuth Setup

### Google OAuth Configuration

**1. Create OAuth Client:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:1337/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`

**2. Add to `.env`:**
```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:1337/api/auth/google/callback
```

### Apple Sign-In Configuration

Apple Sign-In requires a **paid Apple Developer account** ($99/year).

**1. Create App ID:**
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Click **+** to create new identifier
4. Select **App IDs** → Continue
5. Select **App** → Continue
6. Description: "Your App Name"
7. Bundle ID: `com.yourdomain.app`
8. Enable **Sign In with Apple** capability
9. Register

**2. Create Service ID:**
1. **Identifiers** → **+** → **Services IDs**
2. Description: "Your App Web Service"
3. Identifier: `com.yourdomain.service` (this becomes your `APPLE_CLIENT_ID`)
4. Enable **Sign In with Apple**
5. Click **Configure**:
   - Primary App ID: Select the App ID you created
   - Domains: `yourdomain.com` (or `localhost` for dev)
   - Return URLs:
     - Development: `http://localhost:1337/api/auth/apple/callback`
     - Production: `https://yourdomain.com/api/auth/apple/callback`
6. Continue → Register

**3. Generate Private Key:**
1. **Keys** → **+** (Create a new key)
2. Key Name: "Sign In with Apple Key"
3. Enable **Sign In with Apple**
4. Click **Configure** → Select your Primary App ID
5. Continue → Register
6. **⚠️ DOWNLOAD THE `.p8` FILE IMMEDIATELY** - Apple only shows this once!
7. Note the **Key ID** (10 characters, e.g., `ABCDEF1234`)

**4. Save Private Key to `keys/` Directory:**
```bash
# Create keys directory if it doesn't exist
mkdir -p keys

# Move the downloaded .p8 file to keys/
# Replace "AuthKey_ABCDEF1234.p8" with your actual filename
mv ~/Downloads/AuthKey_ABCDEF1234.p8 keys/

# Set secure permissions (read-only for owner)
chmod 600 keys/AuthKey_*.p8

# Verify the file exists
ls -l keys/
```

**5. Find Team ID:**
1. Top right corner of Apple Developer Portal
2. Click your name → **View Membership**
3. Copy the **Team ID** (10 characters)

**6. Add to `.env`:**
```bash
APPLE_CLIENT_ID=com.yourdomain.service
APPLE_TEAM_ID=ABCDEF1234
APPLE_KEY_ID=ABCDEF1234
APPLE_REDIRECT_URI=http://localhost:1337/api/auth/apple/callback
```

**Important Notes:**
- ⚠️ The `.p8` private key is shown **only once** - download immediately
- ⚠️ Never commit `.p8` files to git (already in `.gitignore`)
- ⚠️ For production, store keys securely (AWS Secrets Manager, Vault, etc.)
- The `keys/` directory is mounted read-only in Docker (`./keys:/app/keys:ro`)

### Testing OAuth Flow

**Google OAuth:**
```bash
# Start dev server
pnpm dev

# Navigate to admin panel
open http://localhost:3000/admin

# Click "Sign in with Google"
# Should redirect to Google login
```

**Apple OAuth:**
```bash
# Same process, but click "Sign in with Apple"
# Note: Apple OAuth requires HTTPS in production
# For local dev, Apple allows http://localhost
```

### Troubleshooting OAuth

**Google OAuth Issues:**
- ✅ Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- ✅ Check redirect URI matches exactly in Google Console
- ✅ Ensure Google+ API is enabled

**Apple OAuth Issues:**
- ✅ Verify `.p8` file exists: `ls -l keys/`
- ✅ Check `APPLE_KEY_ID` matches the key file name
- ✅ Verify `APPLE_TEAM_ID` is correct (10 characters)
- ✅ Check `APPLE_CLIENT_ID` matches Service ID exactly
- ✅ Ensure redirect URI matches exactly in Apple Developer Portal

## Development Workflow

### Docker Usage Clarification
- **Development**: Run on host machine (`pnpm dev`) - enables hot reload
- **Services**: Run in Docker containers (PostgreSQL, Redis)
- **Production**: Entire app runs in Docker container
- **Testing**: Run on host machine with Docker services available

### Essential Commands

**Development:**
```bash
pnpm dev              # Start both API + Admin panel
pnpm dev:api          # Start API only (backend)
pnpm dev:frontend     # Start admin panel only (Next.js)
pnpm dev:init         # Complete dev environment setup
```

**Docker Services:**
```bash
pnpm docker:start     # Start all services
pnpm docker:stop      # Stop all services
pnpm docker:health    # Check service health
pnpm docker:postgres  # Start PostgreSQL only
pnpm docker:redis     # Start Redis only
```

**Database:**
```bash
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio (GUI)
pnpm docker:postgres:exec  # PostgreSQL psql shell
pnpm docker:postgres:backup # Backup database
```

**Testing:**
```bash
pnpm test                 # Run tests with Vitest
ppnpm test:coverage    # Coverage report
ppnpm test:db:setup    # Complete test DB setup
ppnpm test:db:reset    # Drop and recreate test DB
ppnpm test:db:migrate  # Apply migrations to test DB
```

**Code Quality:**
```bash
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm type-check       # TypeScript
```

**View Logs:**
```bash
docker compose logs -f           # All services
pnpm docker:api:log           # API only
pnpm docker:postgres:log      # PostgreSQL only
pnpm docker:redis:log         # Redis only
```

### Command Execution Rules
- ❌ **NEVER use `timeout` or `sleep` commands** - Causes delays and blocks execution
- ✅ **Run commands directly** without artificial delays
- ✅ **Use background processes** (`&`) or `run_in_background` if needed
- ✅ **Check exit codes and outputs** instead of waiting

## Database Development

### Schema Changes

1. **Modify schema** in `backend/src/db/schema/*.ts`
2. **Generate migration:**
   ```bash
   pnpm db:generate
   ```
3. **Review migration** in `backend/src/db/migrations/`
4. **Apply migration:**
   ```bash
   pnpm db:migrate
   ```
5. **Update test database:**
   ```bash
   ppnpm test:db:migrate
   ```

### Database Practices
- ✅ One schema file per domain
- ✅ Always use `timestamp` with timezone
- ✅ Index foreign keys automatically
- ✅ Use `serial` for auto-increment IDs
- ✅ Use `pgEnum` for constrained fields
- ❌ NEVER edit existing migrations
- ❌ NEVER concatenate SQL strings

### Drizzle Studio
Visual database browser:
```bash
pnpm db:studio
```
Opens at http://localhost:4983

## Testing Guide

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

### Running Tests

**Run all tests:**
```bash
pnpm test
```

**Run specific test file:**
```bash
pnpm test test/routes/profile.routes.test.ts
```

**Run with coverage:**
```bash
ppnpm test:coverage
```

### Test Database Management

**Quick setup (recommended):**
```bash
ppnpm test:db:setup    # Creates DB + runs migrations + verifies
```

**Individual commands:**
```bash
ppnpm test:db:create   # Create test database
ppnpm test:db:drop     # Drop test database
ppnpm test:db:reset    # Drop and recreate (clean slate)
ppnpm test:db:migrate  # Apply migrations to test DB
```

**Common workflow:**
```bash
# 1. Start PostgreSQL
pnpm docker:postgres

# 2. Setup test database (first time or after schema changes)
ppnpm test:db:setup

# 3. Run tests
pnpm test

# 4. After migration changes
ppnpm test:db:migrate
```

### Test Best Practices
- Use test factories for realistic data (`backend/test/helper/factories.ts`)
- Tests are independent (no shared state)
- Tables truncated between tests
- Full request/response cycles for integration tests
- Test RBAC and security validation
- Test error paths and edge cases

### Coverage Thresholds
- **Lines**: 100%
- **Functions**: 100%
- **Statements**: 100%
- **Branches**: 89% (complex conditionals)

For detailed testing documentation, see [backend/test/README.md](./backend/test/README.md)

## Code Quality

### TypeScript
- Strict mode enabled
- Explicit return types on exported functions
- No `any` types (use `unknown` if needed)
- Interface over type for object shapes

### Path Aliases
Use `@/*` instead of relative paths:
```typescript
import { env } from '@/config/env';
import { db } from '@/db/client';
import { users } from '@/db/schema/users';
```

### Naming Conventions
- **camelCase**: variables and functions
- **PascalCase**: classes and interfaces
- **UPPER_SNAKE_CASE**: constants
- **kebab-case**: file names

### Code Organization
- One feature per file/directory
- Export named functions (avoid default exports)
- Keep files under 300 lines
- Use barrel exports (index.ts) for modules

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature

# Create pull request
```

## Admin Panel Development

### Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- shadcn/ui + Radix UI
- TailwindCSS v4 with OKLCH colors
- Zustand for state management

### Running Admin Panel
```bash
pnpm dev:frontend     # Development server
pnpm build:frontend   # Production build
```

### Styling Guidelines
Use OKLCH theme variables from `frontend/app/globals.css`:

```tsx
// Text colors
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Secondary text</p>

// Backgrounds
<div className="bg-background">...</div>
<div className="bg-primary/10">...</div>  // 10% opacity

// Borders
<div className="border border-border">...</div>
```

### Adding shadcn/ui Components
```bash
# Install a component
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add table

# Components are added to frontend/src/components/ui/
```

## Troubleshooting

### Services Won't Start
```bash
docker compose down -v && docker compose up -d
```

### PostgreSQL Connection Errors
```bash
docker compose exec postgres pg_isready -U postgres
docker compose logs postgres

# Check if container is running
docker ps | grep postgres

# Restart PostgreSQL
pnpm docker:postgres
```

### Redis Connection Errors
```bash
docker compose exec redis redis-cli ping
docker compose logs redis

# Check if container is running
docker ps | grep redis

# Restart Redis
pnpm docker:redis
```

### API Not Responding
```bash
curl http://localhost:1337/health
docker compose logs api

# Check if port is in use
lsof -i :1337
```

### "API key is required" Error
1. Ensure setup wizard completed successfully
2. Check `NEXT_PUBLIC_ADMIN_PANEL_API_KEY` in root `.env`
3. Rebuild admin panel:
   ```bash
   pnpm build:frontend
   ```
4. Restart dev server:
   ```bash
   pnpm dev
   ```

### 401 Unauthorized After Login
1. Check user role in database (must be admin or superadmin)
2. Verify `JWT_SECRET` matches between requests
3. Check browser localStorage for access_token
4. Try logging out and back in

### OAuth Redirect Not Working
1. Check redirect URI in `.env` matches OAuth provider settings
2. For Google: `http://localhost:1337/api/auth/google/callback`
3. For Apple: `http://localhost:1337/api/auth/apple/callback`
4. Ensure OAuth credentials are correct in `.env`

### Collections Not Showing Data
1. Verify table name matches database exactly
2. Check column names in `backend/src/config/collections.ts`
3. Ensure user has admin/superadmin role
4. Check API key is valid

### Test Database Issues
```bash
# Test database doesn't exist
ppnpm test:db:create

# Migrations not applied to test DB
ppnpm test:db:migrate

# Schema out of sync (common after migrations)
ppnpm test:db:reset
ppnpm test:db:migrate

# Complete reset (recommended for clean slate)
ppnpm test:db:setup

# Tests fail with "column does not exist"
ppnpm test:db:migrate
```

### Test Failures After Schema Changes
1. Apply migrations to test database:
   ```bash
   ppnpm test:db:migrate
   ```
2. Or reset test database:
   ```bash
   ppnpm test:db:reset && ppnpm test:db:migrate
   ```
3. Update test factories if schema changed (`backend/test/helper/factories.ts`)
4. Update test cases to use new schema fields

### Scripts Permission Denied
```bash
find scripts-docker -name "*.sh" -exec chmod +x {} \;
find scripts -name "*.sh" -exec chmod +x {} \;
```

### TypeScript Path Alias Errors
Check `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "moduleResolution": "bundler"
  }
}
```

Then run:
```bash
pnpm type-check
```

### Port Already in Use
```bash
# Find process using port
lsof -i :1337  # API port
lsof -i :3000  # Admin panel port
lsof -i :5432  # PostgreSQL port
lsof -i :6379  # Redis port

# Kill process
kill -9 <PID>
```

### Docker Volume Issues
```bash
# Remove all volumes (WARNING: deletes all data)
docker compose down -v

# Remove specific volume
docker volume rm fastify_oauth_postgres_data

# Recreate everything
pnpm dev:init
```

## Performance Tips

### API Response Times
- < 100ms for simple queries
- < 500ms for complex queries
- < 1s for OAuth flows
- Use Redis caching for slow operations

### Database Optimization
- Connection pooling (reuse connections)
- Query batching where possible
- Use indexes on foreign keys and email
- Monitor slow query log with `EXPLAIN ANALYZE`

### Development Performance
- Use `pnpm dev:api` or `pnpm dev:frontend` separately if needed
- Close Drizzle Studio when not in use
- Limit Docker logs: `docker compose logs --tail=100 -f`

## Useful Development Tools

### Database Tools
- **Drizzle Studio**: `pnpm db:studio` (GUI)
- **psql**: `pnpm docker:postgres:exec` (CLI)
- **Backup**: `pnpm docker:postgres:backup`

### Monitoring
- **Health Check**: `curl http://localhost:1337/health`
- **Docker Health**: `pnpm docker:health`
- **Logs**: `docker compose logs -f`

### Debugging
- **VS Code**: Use debugger with `launch.json`
- **Console**: Add `console.log()` or `fastify.log.info()`
- **Pino**: Structured JSON logs in development

## Critical DO NOTs

❌ **NEVER commit .env files** with real credentials
❌ **NEVER use :latest** Docker tags
❌ **NEVER run containers as root**
❌ **NEVER use synchronous I/O** in request handlers
❌ **NEVER concatenate SQL** strings (always parameterize)
❌ **NEVER expose stack traces** in production API responses
❌ **NEVER skip database migrations** (always migrate up/down)
❌ **NEVER hardcode configuration** (use environment variables)
❌ **NEVER use .js extensions** in TypeScript imports
❌ **NEVER use timeout or sleep commands** in bash

## Critical DOs

✅ **ALWAYS pin dependency versions** (exact in package.json)
✅ **ALWAYS use async/await** (never callbacks)
✅ **ALWAYS validate environment variables** on startup
✅ **ALWAYS include health checks** in Dockerfiles
✅ **ALWAYS use non-root users** in containers
✅ **ALWAYS structure logs as JSON** for aggregation
✅ **ALWAYS handle errors explicitly** (no silent failures)
✅ **ALWAYS test locally before committing**
✅ **ALWAYS use path aliases** (`@/*`) instead of relative paths
✅ **ALWAYS use named exports** (avoid default exports)

## Support Resources

**Official Documentation:**
- [Fastify](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Next.js](https://nextjs.org/docs)
- [Vitest](https://vitest.dev/)

**Community:**
- [Fastify Discord](https://discord.gg/fastify)
- Stack Overflow: Tag with [fastify] [docker] [oauth]

---

**See also:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Project structure and tech stack
- [API.md](./API.md) - API endpoints and authentication
- [DOCKER.md](./DOCKER.md) - Docker configuration
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [backend/test/README.md](./backend/test/README.md) - Comprehensive testing guide
