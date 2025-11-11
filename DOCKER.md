# Docker Guide

## Docker Philosophy

### Single docker-compose.yml
- **ONE compose file** for all environments
- Environment differences via `.env` files
- No `docker-compose.dev.yml` or `docker-compose.prod.yml`
- All services defined in single file
- No 'version' field (deprecated in Docker Compose v2.39.4+)

### Development vs Production
- **Development**: Run on host machine (`pnpm dev`) - enables hot reload
- **Services**: Run in Docker containers (PostgreSQL, Redis, Caddy)
- **Production**: Entire app runs in Docker container
- **Testing**: Run on host machine with Docker services available

## Docker Standards

### Dockerfile Requirements
- **Production builds only** - Development runs on host
- Multi-stage builds MANDATORY
- Non-root user REQUIRED (nodejs:nodejs 1001:1001)
- Health checks on ALL services
- Pinned base images (node:22-alpine, postgres:15-alpine, NEVER :latest)
- `.dockerignore` includes node_modules, .git, .env
- NO development or testing stages

### Container Naming Convention
Use environment variables for container names:
```yaml
container_name: ${CONTAINER_POSTGRES_NAME}
image: ${CONTAINER_POSTGRES_NAME}-img
```

Define in `.env`:
```bash
CONTAINER_POSTGRES_NAME=fastify-oauth-postgres
CONTAINER_REDIS_NAME=fastify-oauth-redis
CONTAINER_API_NAME=fastify-oauth-api
CONTAINER_CADDY_NAME=fastify-oauth-caddy
```

### Service Naming
- **Network**: api-network (single custom network)
- **Volumes**:
  - `fastify_oauth_postgres_data`
  - `fastify_oauth_redis_data`
  - `fastify_oauth_caddy_data`

## Service Configuration

### PostgreSQL

**Dockerfile Location**: `docker/database/database.Dockerfile`

**Configuration:**
- Base image: `postgres:15-alpine`
- Custom `postgresql.conf` for performance tuning
- Init script: `init-db.sh` (creates databases)
- Backup script: `backup-internal.sh`
- Health check: `pg_isready -U postgres`

**Volumes:**
- Data: `fastify_oauth_postgres_data:/var/lib/postgresql/data`
- Config: `./docker/database/postgresql.conf:/etc/postgresql/postgresql.conf`
- Init: `./docker/database/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh`

**Ports:**
- `5432:5432` (exposed to host for development access)

**Resource Limits:**
- CPU: 1.0
- Memory: 1GB

**Environment Variables:**
- `POSTGRES_USER` - Database username
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Default database name

### Redis

**Dockerfile Location**: `docker/redis/redis.Dockerfile`

**Configuration:**
- Base image: `redis:7-alpine`
- Custom `redis.conf` for persistence and performance
- AOF persistence enabled
- Health check: `redis-cli ping`

**Volumes:**
- Data: `fastify_oauth_redis_data:/data`
- Config: `./docker/redis/redis.conf:/usr/local/etc/redis/redis.conf`

**Ports:**
- `6379:6379` (exposed to host for development access)

**Resource Limits:**
- CPU: 0.5
- Memory: 512MB

**Environment Variables:**
- `REDIS_PASSWORD` - Redis password (required for production)

### Fastify API (Production)

**Dockerfile Location**: `docker/server/server.Dockerfile`

**Multi-Stage Build (Monorepo):**
1. **Stage 1 (backend-deps)**: Install backend production dependencies only
2. **Stage 2 (backend-builder)**: Build backend TypeScript to JavaScript
3. **Stage 3 (frontend-builder)**: Build Next.js admin panel
4. **Stage 4 (production)**: Final production image combining both workspaces

**Configuration:**
- Base image: `node:22-alpine`
- Non-root user: `nodejs:nodejs` (1001:1001)
- Health check: `curl -f http://localhost:1337/health`

**Volumes:**
- Keys: `./keys:/app/keys:ro` (OAuth private keys, read-only)

**Ports:**
- `1337:1337` (exposed to Caddy reverse proxy)

**Resource Limits:**
- CPU: 2.0
- Memory: 2GB

**Environment Variables:**
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for full list

### Caddy (Reverse Proxy)

**Dockerfile Location**: `docker/caddy/caddy.Dockerfile`

**Configuration:**
- Base image: `caddy:2-alpine`
- Automatic HTTPS via Let's Encrypt
- Request/response logging
- Health check forwarding to `/health`

**Volumes:**
- Config: `./docker/caddy/Caddyfile:/etc/caddy/Caddyfile`
- Data: `fastify_oauth_caddy_data:/data`
- Certificates: `fastify_oauth_caddy_data:/config`

**Ports:**
- `80:80` (HTTP, auto-redirect to HTTPS)
- `443:443` (HTTPS)

**Resource Limits:**
- CPU: 0.5
- Memory: 256MB

**Environment Variables:**
- `CADDY_DOMAIN` - Domain name (localhost for dev, real domain for prod)
- `CADDY_EMAIL` - Email for Let's Encrypt certificates
- `CADDY_ACME_CA` - ACME CA URL (staging for dev, production for prod)

## Docker Compose Example

```yaml
services:
  postgres:
    container_name: ${CONTAINER_POSTGRES_NAME}
    image: ${CONTAINER_POSTGRES_NAME}-img
    build:
      context: .
      dockerfile: docker/database/database.Dockerfile
    environment:
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      POSTGRES_DB: ${DATABASE_NAME}
    volumes:
      - fastify_oauth_postgres_data:/var/lib/postgresql/data
      - ./docker/database/postgresql.conf:/etc/postgresql/postgresql.conf
      - ./docker/database/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    ports:
      - "${DATABASE_PORT}:5432"
    networks:
      - api-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  redis:
    container_name: ${CONTAINER_REDIS_NAME}
    image: ${CONTAINER_REDIS_NAME}-img
    build:
      context: .
      dockerfile: docker/redis/redis.Dockerfile
    command: redis-server /usr/local/etc/redis/redis.conf --requirepass ${REDIS_PASSWORD}
    volumes:
      - fastify_oauth_redis_data:/data
      - ./docker/redis/redis.conf:/usr/local/etc/redis/redis.conf
    ports:
      - "${REDIS_PORT}:6379"
    networks:
      - api-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

volumes:
  fastify_oauth_postgres_data:
  fastify_oauth_redis_data:
  fastify_oauth_caddy_data:

networks:
  api-network:
    driver: bridge
```

## Management Scripts

### scripts-docker/ Structure

Modular scripts for managing Docker services:

```
scripts-docker/
├── postgres/         # PostgreSQL scripts
│   ├── run.sh        # Start PostgreSQL
│   ├── stop.sh       # Stop PostgreSQL
│   ├── log.sh        # View logs
│   ├── exec.sh       # Execute psql shell
│   ├── backup.sh     # Backup database
│   └── remove.sh     # Remove container + volume
├── redis/            # Redis scripts
│   ├── run.sh        # Start Redis
│   ├── stop.sh       # Stop Redis
│   ├── log.sh        # View logs
│   ├── exec.sh       # Execute Redis CLI
│   └── remove.sh     # Remove container + volume
├── api/              # API scripts
│   ├── run.sh        # Start API (production)
│   ├── stop.sh       # Stop API
│   ├── log.sh        # View logs
│   ├── exec.sh       # Execute shell in container
│   ├── rebuild.sh    # Rebuild image
│   └── remove.sh     # Remove container
├── caddy/            # Caddy scripts
│   ├── run.sh        # Start Caddy
│   ├── stop.sh       # Stop Caddy
│   ├── log.sh        # View logs
│   ├── exec.sh       # Execute shell
│   ├── reload.sh     # Reload config
│   └── remove.sh     # Remove container
└── system/           # System-wide scripts
    ├── start-all.sh  # Start all services
    ├── stop-all.sh   # Stop all services
    ├── restart-all.sh # Restart all services
    ├── health-check.sh # Check service health
    ├── logs-all.sh   # View all logs
    ├── remove-all.sh # Remove all containers
    └── remove-volumes.sh # Remove all volumes
```

### Common Commands

**Using pnpm scripts (recommended):**
```bash
# Start/Stop services
pnpm docker:start        # Start all services
pnpm docker:stop         # Stop all services
pnpm docker:health       # Check service health

# PostgreSQL
pnpm docker:postgres     # Start PostgreSQL only
pnpm docker:postgres:exec # PostgreSQL psql shell
pnpm docker:postgres:log # View PostgreSQL logs
pnpm docker:postgres:backup # Backup database

# Redis
pnpm docker:redis        # Start Redis only
pnpm docker:redis:exec   # Redis CLI
pnpm docker:redis:log    # View Redis logs

# API (production)
pnpm docker:api          # Start API container
pnpm docker:api:log      # View API logs
pnpm docker:api:rebuild  # Rebuild API image

# Caddy
pnpm docker:caddy        # Start Caddy
pnpm docker:caddy:log    # View Caddy logs
pnpm docker:caddy:reload # Reload Caddyfile
```

**Direct script execution:**
```bash
bash scripts-docker/start.sh           # Quick start all
bash scripts-docker/system/stop-all.sh # Stop all
bash scripts-docker/postgres/exec.sh   # PostgreSQL shell
```

## Database & Redis Access

### PostgreSQL Access

**Recommended (pnpm script):**
```bash
pnpm docker:postgres:exec
```

**Alternative methods:**
```bash
# Direct docker exec
docker exec -it fastify-oauth-postgres psql -U postgres -d fastify_oauth_db

# Via localhost (from host machine)
psql postgresql://postgres:password@localhost:5432/fastify_oauth_db

# From container network
# Use service name 'postgres' instead of 'localhost'
```

### Redis Access

**Recommended (pnpm script):**
```bash
pnpm docker:redis:exec
```

**Alternative methods:**
```bash
# Direct docker exec
docker exec -it fastify-oauth-redis redis-cli -a <password>

# Via localhost (from host machine)
redis-cli -h localhost -p 6379 -a <password>
```

## Docker Security

### Security Best Practices
- ✅ **Non-root users** in ALL containers
- ✅ **Resource limits** on all services (CPU, memory)
- ✅ **Health checks** for monitoring
- ✅ **Read-only file systems** where possible
- ✅ **No secrets** in Dockerfiles or images
- ✅ **Pinned base images** (no :latest tags)
- ✅ **.dockerignore** to exclude sensitive files

### Docker Security Checklist
- [ ] All containers run as non-root users
- [ ] Resource limits configured for all services
- [ ] Health checks implemented
- [ ] Secrets via environment variables (not hardcoded)
- [ ] Base images pinned to specific versions
- [ ] .dockerignore includes .env, .git, node_modules
- [ ] Production builds use multi-stage Dockerfiles
- [ ] No development dependencies in production images

## Troubleshooting

### Services Won't Start
```bash
docker compose down -v && docker compose up -d
```

### PostgreSQL Connection Errors
```bash
docker compose exec postgres pg_isready -U postgres
docker compose logs postgres
```

### Redis Connection Errors
```bash
docker compose exec redis redis-cli ping
docker compose logs redis
```

### API Not Responding
```bash
curl http://localhost:3000/health
docker compose logs api
```

### View Logs
```bash
docker compose logs -f           # All services
docker compose logs -f postgres  # PostgreSQL only
docker compose logs -f redis     # Redis only
docker compose logs -f api       # API only
docker compose logs -f caddy     # Caddy only
```

### Remove Everything (Clean Slate)
```bash
# Stop and remove all containers
docker compose down

# Remove volumes (WARNING: deletes all data)
docker compose down -v

# Remove images
docker compose down --rmi all
```

### Permission Errors
```bash
# Make scripts executable
find scripts-docker -name "*.sh" -exec chmod +x {} \;
```

## Caddy Configuration

### Development (Staging Let's Encrypt)
Use staging ACME CA to avoid rate limits:

```bash
# .env
CADDY_DOMAIN=localhost
CADDY_EMAIL=dev@example.com
CADDY_ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory
```

### Production (Production Let's Encrypt)
Use production ACME CA with real domain:

```bash
# .env
CADDY_DOMAIN=api.yourdomain.com
CADDY_EMAIL=admin@yourdomain.com
CADDY_ACME_CA=https://acme-v02.api.letsencrypt.org/directory
```

### Caddyfile Structure
```
{$CADDY_DOMAIN} {
    reverse_proxy api:1337

    # Automatic HTTPS
    tls {$CADDY_EMAIL} {
        ca {$CADDY_ACME_CA}
    }

    # Health check forwarding
    handle /health {
        reverse_proxy api:1337
    }

    # Logging
    log {
        output file /var/log/caddy/access.log
    }
}
```

## Performance Tuning

### PostgreSQL Optimization
Edit `docker/database/postgresql.conf`:
```conf
# Connection Settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 8MB

# Write Performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Redis Optimization
Edit `docker/redis/redis.conf`:
```conf
# Persistence
appendonly yes
appendfsync everysec

# Memory
maxmemory 512mb
maxmemory-policy allkeys-lru

# Performance
tcp-keepalive 300
timeout 300
```

## Docker Compose Commands Reference

```bash
# Start services
docker compose up -d                    # Detached mode
docker compose up -d --build            # Rebuild images

# Stop services
docker compose stop                     # Stop (don't remove)
docker compose down                     # Stop and remove

# View status
docker compose ps                       # Running containers
docker compose top                      # Process info

# Logs
docker compose logs -f                  # Follow all logs
docker compose logs -f postgres         # Follow specific service

# Execute commands
docker compose exec postgres psql -U postgres
docker compose exec redis redis-cli

# Rebuild
docker compose build                    # Rebuild all images
docker compose build api                # Rebuild specific service

# Clean up
docker compose down -v                  # Remove volumes
docker compose down --rmi all           # Remove images
```

---

**See also:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Project structure and tech stack
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
