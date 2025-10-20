#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "=========================================="
echo "${BLUE}Starting Fastify OAuth API Stack${NC}"
echo "=========================================="

# Create network if it doesn't exist
echo "\n${YELLOW}→${NC} Creating Docker network..."
docker network inspect ${DOCKER_NETWORK_NAME:-api-network} >/dev/null 2>&1 || \
    docker network create ${DOCKER_NETWORK_NAME:-api-network}
echo "${GREEN}✓${NC} Network ready"

# Start services in proper order
echo "\n${YELLOW}→${NC} Starting PostgreSQL..."
docker compose up -d postgres
echo "${GREEN}✓${NC} PostgreSQL started"

echo "\n${YELLOW}→${NC} Starting Redis..."
docker compose up -d redis
echo "${GREEN}✓${NC} Redis started"

echo "\n${YELLOW}→${NC} Waiting for database to be healthy..."
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose ps postgres | grep -q "healthy"; then
        echo "${GREEN}✓${NC} PostgreSQL is healthy"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    printf "."
done

if [ $elapsed -ge $timeout ]; then
    echo "\n${RED}✗${NC} PostgreSQL health check timeout"
    exit 1
fi

echo "\n${YELLOW}→${NC} Waiting for Redis to be healthy..."
timeout=30
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose ps redis | grep -q "healthy"; then
        echo "${GREEN}✓${NC} Redis is healthy"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    printf "."
done

if [ $elapsed -ge $timeout ]; then
    echo "\n${RED}✗${NC} Redis health check timeout"
    exit 1
fi

echo "\n${YELLOW}→${NC} Starting API..."
docker compose up -d api
echo "${GREEN}✓${NC} API started"

echo "\n${YELLOW}→${NC} Waiting for API to be healthy..."
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose ps api | grep -q "healthy"; then
        echo "${GREEN}✓${NC} API is healthy"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    printf "."
done

if [ $elapsed -ge $timeout ]; then
    echo "\n${RED}✗${NC} API health check timeout"
    exit 1
fi

echo "\n${YELLOW}→${NC} Starting Caddy reverse proxy..."
docker compose up -d caddy
echo "${GREEN}✓${NC} Caddy started"

echo "\n=========================================="
echo "${GREEN}✓ All services started successfully${NC}"
echo "=========================================="

echo "\n${BLUE}Service Status:${NC}"
docker compose ps

echo "\n${BLUE}Useful Commands:${NC}"
echo "  • Health check:    ${YELLOW}npm run docker:health${NC}"
echo "  • View all logs:   ${YELLOW}npm run docker:logs${NC}"
echo "  • View API logs:   ${YELLOW}npm run docker:api:log${NC}"
echo "  • Stop all:        ${YELLOW}npm run docker:stop${NC}"

echo "\n${BLUE}API Endpoints:${NC}"
echo "  • Health:          ${YELLOW}http://localhost:${PORT:-3000}/health${NC}"
echo "  • Documentation:   ${YELLOW}http://localhost:${PORT:-3000}/documentation${NC}"
echo "  • API:             ${YELLOW}http://localhost:${PORT:-3000}/api${NC}"
