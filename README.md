# Fastify v5 OAuth API

Production-ready Fastify v5 OAuth API with PostgreSQL, Redis, Docker orchestration, and 2025 best practices.

## Tech Stack

- **Runtime:** Node.js 22+ LTS (ES Modules only)
- **Framework:** Fastify 5.6.1+
- **Language:** TypeScript 5.9.3+ (strict mode)
- **Database:** PostgreSQL 15-alpine + Drizzle ORM 0.44.6+
- **Cache:** Redis 7-alpine
- **Reverse Proxy:** Caddy 2-alpine (automatic HTTPS)
- **Authentication:** OAuth 2.0 (Google + Apple Sign-In) + JWT
- **Containerization:** Docker 27.0+ with Compose v2.39.4+

## Quick Start

### Prerequisites

- Docker 27.0+ and Docker Compose v2.39.4+
- Node.js 22+ (for local development)
- npm 10+

### Setup

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the stack:**
   ```bash
   npm run docker:start
   ```

4. **Check health:**
   ```bash
   npm run docker:health
   ```

5. **View logs:**
   ```bash
   npm run docker:logs
   ```

## Docker Architecture

### Services

| Service | Port | Image | Description |
|---------|------|-------|-------------|
| **postgres** | 5432 | postgres:15-alpine | PostgreSQL database |
| **redis** | 6379 | redis:7-alpine | Redis cache & sessions |
| **api** | 3000 | custom (Node 22) | Fastify application |
| **caddy** | 80, 443 | caddy:2-alpine | Reverse proxy + HTTPS |

### Key Features

- **Single docker-compose.yml** (NO version field - deprecated in v2.39.4+)
- **All container names via environment variables** (`${CONTAINER_*_NAME}`)
- **Multi-stage Dockerfiles** for optimized builds
- **Non-root users** in all containers (nodejs:nodejs 1001:1001)
- **Health checks** on ALL services
- **Resource limits** (CPU, memory) defined
- **Custom network:** `api-network`
- **Named volumes:** `fastify_oauth_*_data`

## Management Scripts

All management scripts are in `scripts-docker/` with a modular structure:

### Quick Commands

```bash
# Start entire stack
npm run docker:start

# Stop entire stack
npm run docker:stop

# Health check all services
npm run docker:health

# View all logs
npm run docker:logs
```

### Service-Specific Commands

**PostgreSQL:**
```bash
npm run docker:postgres         # Start
npm run docker:postgres:stop    # Stop
npm run docker:postgres:log     # Logs
npm run docker:postgres:exec    # Open psql
npm run docker:postgres:backup  # Create backup
```

**Redis:**
```bash
npm run docker:redis            # Start
npm run docker:redis:stop       # Stop
npm run docker:redis:log        # Logs
npm run docker:redis:exec       # Open redis-cli
```

**API:**
```bash
npm run docker:api              # Start
npm run docker:api:stop         # Stop
npm run docker:api:log          # Logs
npm run docker:api:exec         # Open shell
npm run docker:api:rebuild      # Rebuild & restart
```

**Caddy:**
```bash
npm run docker:caddy            # Start
npm run docker:caddy:stop       # Stop
npm run docker:caddy:log        # Logs
npm run docker:caddy:reload     # Reload config
```

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start Docker services (DB + Redis)
npm run docker:postgres
npm run docker:redis

# Run API in development mode (hot reload)
npm run dev
```

### Database Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
fastify-oauth-api/
├── docker/                          # Service-specific Docker configs
│   ├── caddy/                       # Caddy (reverse proxy)
│   ├── database/                    # PostgreSQL
│   ├── redis/                       # Redis cache
│   └── server/                      # Fastify app
├── scripts-docker/                  # Modular management scripts
│   ├── postgres/                    # DB scripts
│   ├── redis/                       # Cache scripts
│   ├── api/                         # API scripts
│   ├── caddy/                       # Proxy scripts
│   └── system/                      # System-wide scripts
├── src/
│   ├── db/                          # Database layer
│   │   ├── schema/                  # Drizzle schemas
│   │   ├── migrations/              # SQL migrations
│   │   ├── seeds/                   # Seed data
│   │   └── client.ts                # DB connection
│   ├── modules/                     # Feature modules
│   │   ├── auth/                    # Authentication (TO IMPLEMENT)
│   │   └── user/                    # User management (TO IMPLEMENT)
│   ├── routes/                      # API endpoints
│   │   ├── api/                     # API routes (TO IMPLEMENT)
│   │   └── health.ts                # Health check ✓
│   ├── plugins/                     # Fastify plugins (TO IMPLEMENT)
│   ├── middleware/                  # Custom middleware (TO IMPLEMENT)
│   ├── config/                      # Configuration ✓
│   ├── utils/                       # Utilities ✓
│   ├── types/                       # Type definitions (TO IMPLEMENT)
│   ├── schemas/                     # Validation schemas (TO IMPLEMENT)
│   ├── services/                    # Business logic (TO IMPLEMENT)
│   ├── app.ts                       # Fastify app factory ✓
│   └── server.ts                    # Server entry point ✓
├── test/                            # Tests (TO IMPLEMENT)
├── keys/                            # OAuth keys (gitignored)
├── docker-compose.yml               # Orchestration ✓
├── .env.example                     # Environment template ✓
├── tsconfig.json                    # TypeScript config ✓
├── drizzle.config.ts                # Drizzle config ✓
└── package.json                     # Dependencies ✓
```

## Current Implementation Status

### ✅ Completed

- [x] Complete Docker infrastructure (compose + all Dockerfiles)
- [x] Modular scripts-docker/ architecture
- [x] Environment configuration (.env.example)
- [x] TypeScript setup (strict mode)
- [x] Database schema (users table)
- [x] Database client (Drizzle ORM)
- [x] Config layer (environment validation with Zod)
- [x] Utils layer (logger, errors, response formatters)
- [x] Basic Fastify app with essential plugins
- [x] Health check endpoint
- [x] Error handling
- [x] Security headers (Helmet)
- [x] Rate limiting
- [x] CORS
- [x] Compression
- [x] Graceful shutdown

### 🚧 To Implement

The following features need to be implemented to complete the OAuth API:

#### 1. Plugins (`src/plugins/`)

Create the following Fastify plugins:

- **`database.ts`**: Register Drizzle database plugin
- **`redis.ts`**: Register @fastify/redis plugin
- **`jwt.ts`**: Register @fastify/jwt plugin with config
- **`oauth.ts`**: Register @fastify/oauth2 for Google & Apple
- **`swagger.ts`**: API documentation with @fastify/swagger

#### 2. Authentication Module (`src/modules/auth/`)

Implement complete OAuth 2.0 flow:

- **`oauth-google.service.ts`**:
  - Initiate Google OAuth flow
  - Handle callback
  - Verify Google tokens with `google-auth-library`
  - Extract user info

- **`oauth-apple.service.ts`**:
  - Initiate Apple Sign-In flow
  - Handle callback
  - Generate JWT for Apple authentication
  - Verify Apple tokens with `apple-signin-auth`

- **`jwt.service.ts`**:
  - Generate access & refresh tokens
  - Verify tokens
  - Refresh token rotation
  - Store refresh tokens in Redis

- **`auth.service.ts`**:
  - `findOrCreateUser()`: Get or create user from OAuth data
  - `generateTokens()`: Create JWT pair
  - `verifyRefreshToken()`: Validate and rotate refresh token

- **`auth.controller.ts`**:
  - Handle OAuth initiation
  - Handle OAuth callbacks
  - Token refresh endpoint
  - Logout endpoint

- **`auth.schemas.ts`**:
  - Zod schemas for validation
  - Request/response types

#### 3. Authentication Routes (`src/routes/api/auth/`)

- **`oauth.ts`**:
  - `GET /api/auth/oauth/google` - Initiate Google OAuth
  - `GET /api/auth/oauth/google/callback` - Google callback
  - `GET /api/auth/oauth/apple` - Initiate Apple OAuth
  - `POST /api/auth/oauth/apple/callback` - Apple callback

- **`index.ts`**:
  - `POST /api/auth/token/refresh` - Refresh access token
  - `POST /api/auth/logout` - Logout user

#### 4. Middleware (`src/middleware/`)

- **`authenticate.ts`**:
  - JWT authentication middleware
  - Verify bearer token
  - Attach user to request
  - Return 401 if invalid

- **`error-handler.ts`**:
  - Enhanced global error handler
  - Log errors with context
  - Format error responses

- **`request-logger.ts`**:
  - Log all requests
  - Include request ID, method, URL, status, duration

#### 5. User Module (`src/modules/user/`)

- **`user.service.ts`**:
  - `getUserById()`
  - `getUserByEmail()`
  - `updateUser()`
  - `deleteUser()` (soft delete)

- **`user.controller.ts`**:
  - Get authenticated user profile
  - Update profile
  - Delete account

- **`user.schemas.ts`**:
  - Validation schemas

- **`src/routes/api/users/index.ts`**:
  - `GET /api/users/me` - Get profile (protected)
  - `PUT /api/users/me` - Update profile (protected)
  - `DELETE /api/users/me` - Delete account (protected)

#### 6. Types (`src/types/`)

- **`auth.ts`**: Authentication type definitions
- **`user.ts`**: User type definitions
- **`index.ts`**: Barrel exports

#### 7. Testing (`test/`)

- **`test/helper/setup.ts`**: Test utilities
- **`test/helper/fixtures.ts`**: Test data
- **`test/routes/auth.test.ts`**: Auth route tests
- **`test/routes/users.test.ts`**: User route tests
- **`test/services/auth.service.test.ts`**: Auth service tests
- **`test/integration/oauth-google.test.ts`**: Google OAuth E2E
- **`test/integration/oauth-apple.test.ts`**: Apple OAuth E2E

## Implementation Guide

### Step 1: OAuth Credentials Setup

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3000/api/auth/oauth/google/callback`
4. Copy Client ID and Secret to `.env`

**Apple Sign-In:**
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Create Service ID
3. Generate private key (.p8)
4. Save private key to `./keys/apple-private-key.p8`
5. Copy Team ID, Key ID, Client ID to `.env`

### Step 2: Implement OAuth Services

Example implementation pattern:

```typescript
// src/modules/auth/oauth-google.service.ts
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function verifyGoogleToken(token: string) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}
```

### Step 3: Implement JWT Service

```typescript
// src/modules/auth/jwt.service.ts
export async function generateTokens(userId: number) {
  const accessToken = await fastify.jwt.sign(
    { userId },
    { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN }
  );

  const refreshToken = await fastify.jwt.sign(
    { userId, type: 'refresh' },
    { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN }
  );

  // Store refresh token in Redis
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    'EX',
    7 * 24 * 60 * 60 // 7 days
  );

  return { accessToken, refreshToken };
}
```

### Step 4: Protected Routes

```typescript
// Example protected route
fastify.get('/api/users/me', {
  preHandler: authenticate, // JWT middleware
  handler: async (request, reply) => {
    const user = await getUserById(request.user.userId);
    return successResponse(user);
  }
});
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/api/auth/oauth/google` | Initiate Google OAuth |
| GET | `/api/auth/oauth/google/callback` | Google OAuth callback |
| GET | `/api/auth/oauth/apple` | Initiate Apple Sign-In |
| POST | `/api/auth/oauth/apple/callback` | Apple Sign-In callback |
| POST | `/api/auth/token/refresh` | Refresh access token |

### Protected Endpoints (require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get authenticated user profile |
| PUT | `/api/users/me` | Update profile |
| DELETE | `/api/users/me` | Delete account |
| POST | `/api/auth/logout` | Logout user |

## Security Best Practices

### Environment Variables

- **NEVER commit `.env` files** with real credentials
- Use strong random secrets:
  ```bash
  # Generate JWT secret
  openssl rand -base64 32
  ```
- Store production secrets in secret manager (AWS Secrets Manager, etc.)

### Docker Security

- All containers run as non-root users
- Resource limits defined
- Read-only file systems where possible
- Security headers via Helmet
- Rate limiting enabled

### API Security

- JWT tokens expire (15m access, 7d refresh)
- Refresh token rotation
- OAuth tokens stored in Redis with TTL
- HTTPS only in production (Caddy handles)
- CORS restricted to known origins in production

## Production Deployment

### Pre-Deployment Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong `JWT_SECRET` (min 32 chars)
- [ ] Strong `DATABASE_PASSWORD` (min 16 chars)
- [ ] `REDIS_PASSWORD` enabled
- [ ] Real domain in `CADDY_DOMAIN`
- [ ] Production Let's Encrypt: `CADDY_ACME_CA=https://acme-v02.api.letsencrypt.org/directory`
- [ ] Valid email in `CADDY_EMAIL`
- [ ] OAuth credentials for production
- [ ] `LOG_PRETTY_PRINT=false`
- [ ] `CORS_ORIGIN` with specific domains
- [ ] Health checks configured
- [ ] Monitoring & alerting set up
- [ ] Backup strategy implemented

### Production Build

```bash
# Build TypeScript
npm run build:prod

# Build Docker images
docker compose build --no-cache

# Start in production mode
NODE_ENV=production docker compose up -d
```

## Troubleshooting

### Services won't start

```bash
docker compose down -v && docker compose up -d
```

### PostgreSQL connection errors

```bash
docker compose exec postgres pg_isready -U postgres
docker compose logs postgres
```

### Redis connection errors

```bash
docker compose exec redis redis-cli ping
docker compose logs redis
```

### API not responding

```bash
curl http://localhost:3000/health
docker compose logs api
```

### Permission denied on scripts

```bash
find scripts-docker -name "*.sh" -exec chmod +x {} \;
```

## Resources

- [Fastify Documentation](https://fastify.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign-In Documentation](https://developer.apple.com/sign-in-with-apple/)

## Support

For issues and questions:
- Check the [CLAUDE.md](./CLAUDE.md) for project guidelines
- Review [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for detailed instructions
- Consult the official documentation links above

---

**Version:** 1.0.0
**Last Updated:** October 2025
**License:** MIT
