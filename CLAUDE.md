# Fastify v5 OAuth API - Project Context

## Tech Stack (2025 Best Practices)

**Runtime & Framework:**
- Node.js 22+ LTS (ES Modules only)
- Fastify 5.6.1+ (latest v5 ecosystem)
- TypeScript 5.9.3+ with strict mode

**Infrastructure:**
- PostgreSQL 15-alpine (primary database)
- Redis 7-alpine (caching & sessions)
- Caddy 2-alpine (reverse proxy + auto HTTPS)
- Docker 27.0+ with Compose v2.39.4+

**ORM & Database:**
- Drizzle ORM 0.44.6+ (type-safe SQL)
- Raw postgres driver for performance
- node-pg-migrate for migrations

**Authentication:**
- OAuth 2.0 (Google + Apple Sign-In)
- @fastify/jwt for token management
- @fastify/oauth2 for provider integration
- Argon2 for password hashing

## Project Architecture

```
fastify-oauth-api/
├── docker/                      # Service-specific Docker configs
│   ├── caddy/                   # Reverse proxy
│   ├── database/                # PostgreSQL
│   ├── redis/                   # Redis cache
│   └── server/                  # Fastify app
├── scripts-docker/              # Modular management scripts
│   ├── postgres/               # DB-specific scripts
│   ├── redis/                  # Cache-specific scripts
│   ├── api/                    # API-specific scripts
│   ├── caddy/                  # Proxy-specific scripts
│   └── system/                 # System-wide scripts
├── src/
│   ├── db/                     # Database layer
│   │   ├── schema.ts           # Drizzle schema
│   │   ├── client.ts           # DB connection
│   │   ├── migrations/         # SQL migrations
│   │   └── seeds/              # Seed data
│   ├── modules/                # Feature modules
│   │   ├── auth/              # Authentication logic
│   │   └── user/              # User management
│   ├── routes/                 # API endpoints
│   ├── plugins/                # Fastify plugins
│   ├── middleware/             # Custom middleware
│   └── config/                 # Configuration
├── docker-compose.yml          # Single orchestration file
└── .env                        # Environment variables
```

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

# Development
npm run dev                      # Hot reload with tsx

# Database
npm run db:generate              # Generate migrations
npm run db:migrate               # Run migrations
npm run db:studio                # Open Drizzle Studio

# Testing
npm test                         # Run tests with Vitest
npm run test:coverage            # Coverage report
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
- Keep files under 200 lines
- Use barrel exports (index.ts) for modules

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
- Pinned base images (node:22-alpine, NEVER :latest)
- .dockerignore includes node_modules, .git, .env

**Container Naming Convention:**
- Use environment variables for container names
- Format: `container_name: ${CONTAINER_SERVICE_NAME}`
- Format: `image: ${CONTAINER_SERVICE_NAME}-img`
- Define in .env: `CONTAINER_POSTGRES_NAME=fastify-oauth-postgres`

**Service Naming:**
- Network: api-network (single custom network)
- Volumes: fastify_oauth_{service}_data

## Database Practices

**Drizzle Schema:**
- One schema file per domain (`src/db/schema/*.ts`)
- Always use `timestamp` with timezone
- Index foreign keys automatically
- Use `serial` for auto-increment IDs

**Migrations:**
- NEVER edit existing migrations
- Create new migration to modify schema
- Run migrations automatically on container start
- Keep migrations reversible when possible

**Queries:**
- Use Drizzle ORM query builder
- Raw SQL only for complex queries
- ALWAYS use parameterized statements: `db.query(sql, [params])`
- Never string concatenation in queries

**Performance:**
- Connection pooling (min: 2, max: 10)
- Index all foreign keys
- Index frequently-queried columns
- Use EXPLAIN ANALYZE for slow queries

## Security Requirements

**Environment Variables:**
- ALL secrets in .env file (NEVER commit .env)
- Provide .env.example with placeholders
- Use ${VARIABLE} references in docker-compose.yml
- Validate all env vars on startup

**Docker Security:**
- Non-root users in ALL containers
- Resource limits on all services (CPU, memory)
- Health checks for monitoring
- Read-only file systems where possible

**API Security:**
- Rate limiting: 100 requests/minute per IP
- CORS restricted to known origins
- Helmet for security headers
- HTTPS only in production (Caddy handles)
- JWT tokens expire (15m access, 7d refresh)

**Authentication:**
- OAuth tokens stored in Redis (1-hour TTL)
- Password hashing with Argon2
- PKCE flow for OAuth providers
- Secure session cookies (httpOnly, secure, sameSite)

## Redis Usage Patterns

**Caching:**
- TTL: 5 minutes for API responses
- Key prefix: `fastify:`
- Invalidate on data updates
- Use Redis SCAN for bulk operations

**Session Management:**
- Store OAuth tokens
- 1-hour TTL for access tokens
- 7-day TTL for refresh tokens
- Automatic cleanup via Redis expiry

**Pub/Sub (Optional):**
- Channel naming: `fastify:{feature}:{event}`
- JSON payloads only
- Error handling for dropped messages

## OAuth Implementation

**Google Sign-In:**
- Scopes: openid, email, profile
- Mobile app support via redirect URLs
- Token validation server-side
- User info caching in Redis

**Apple Sign-In:**
- Private key in ./keys/ (NOT committed)
- Team ID and Key ID in environment
- JWT generation for client authentication
- Handle email privacy relay

**Flow:**
1. Client requests OAuth URL from `/api/auth/oauth/{provider}`
2. User authenticates with provider
3. Provider redirects to callback URL with code
4. Server exchanges code for tokens
5. Server validates tokens and creates user
6. Server issues JWT access + refresh tokens
7. Client uses JWT for subsequent requests

## Caddy Configuration

**Reverse Proxy:**
- Proxies ALL requests to Fastify API
- Automatic HTTPS via Let's Encrypt
- Health check forwarding to `/health`
- Request/response logging

**Development:**
- Use staging Let's Encrypt (avoid rate limits)
- `CADDY_ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory`

**Production:**
- Production Let's Encrypt
- `CADDY_ACME_CA=https://acme-v02.api.letsencrypt.org/directory`
- Real domain in `CADDY_DOMAIN`
- Valid email in `CADDY_EMAIL`

## Testing Standards

**Unit Tests:**
- Vitest as test runner
- Co-locate tests with source: `file.test.ts`
- Mock external dependencies
- Test pure functions in isolation

**Integration Tests:**
- Separate test database
- Use `test/integration/` directory
- Cleanup after each test (truncate tables)
- Mock OAuth providers

**Coverage:**
- Minimum 80% code coverage
- 100% for critical paths (auth, payments)
- Run with: `npm run test:coverage`

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
- Redact email addresses (show only domain)
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
- Use indexes on foreign keys
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

## Production Deployment Checklist

Before deploying to production, verify:

- [ ] `NODE_ENV=production` in .env
- [ ] Strong `JWT_SECRET` (min 32 chars random)
- [ ] Strong `DATABASE_PASSWORD` (min 16 chars random)
- [ ] Redis password enabled (`REDIS_PASSWORD` set)
- [ ] Real domain in `CADDY_DOMAIN`
- [ ] Production Let's Encrypt in `CADDY_ACME_CA`
- [ ] Valid email in `CADDY_EMAIL`
- [ ] OAuth credentials for production (not dev)
- [ ] Health checks configured in orchestrator
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] SSL/TLS for database if exposed
- [ ] Firewall rules configured
- [ ] Log aggregation configured
- [ ] Secrets stored in secret manager (not .env file)

## Support Resources

**Official Documentation:**
- Fastify: https://fastify.dev/
- Drizzle ORM: https://orm.drizzle.team/
- Docker Compose: https://docs.docker.com/compose/
- Caddy: https://caddyserver.com/docs/

**Community:**
- Fastify Discord: https://discord.gg/fastify
- Stack Overflow: Tag with [fastify] [docker] [oauth]

---

**Last Updated:** October 2025  
**Maintainer:** Infrastructure Team  
**Version:** 7.0 (Modular Architecture)
