#!/bin/bash

# ==============================================================================
# Development Environment Initialization
# ==============================================================================
# Complete development setup: services + migrations + seeds + test database
# Usage: npm run dev:init OR bash scripts/dev-init.sh
#
# What it does:
#   1. Start PostgreSQL (skip if running)
#   2. Start Redis (skip if running)
#   3. Wait for health checks
#   4. Run migrations on development database
#   5. Seed superadmin + API keys
#   6. Setup test database
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Set defaults if not in .env
CONTAINER_POSTGRES_NAME="${CONTAINER_POSTGRES_NAME:-fastify-oauth-postgres}"
CONTAINER_REDIS_NAME="${CONTAINER_REDIS_NAME:-fastify-oauth-redis}"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Development Environment Initialization                  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# Step 1: Start PostgreSQL
# ==============================================================================
echo -e "${BLUE}═══ Step 1/6: PostgreSQL Container ═══${NC}"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_POSTGRES_NAME}$"; then
    echo -e "${GREEN}✓ PostgreSQL already running${NC}"
else
    echo -e "${YELLOW}→ Starting PostgreSQL container...${NC}"
    npm run docker:postgres
    echo -e "${GREEN}✓ PostgreSQL started${NC}"
fi
echo ""

# ==============================================================================
# Step 2: Start Redis
# ==============================================================================
echo -e "${BLUE}═══ Step 2/6: Redis Container ═══${NC}"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_REDIS_NAME}$"; then
    echo -e "${GREEN}✓ Redis already running${NC}"
else
    echo -e "${YELLOW}→ Starting Redis container...${NC}"
    npm run docker:redis
    echo -e "${GREEN}✓ Redis started${NC}"
fi
echo ""

# ==============================================================================
# Step 3: Wait for PostgreSQL Health Check
# ==============================================================================
echo -e "${BLUE}═══ Step 3/6: Waiting for PostgreSQL Health Check ═══${NC}"

MAX_WAIT=30
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_POSTGRES_NAME" 2>/dev/null || echo "none")

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✓ PostgreSQL is healthy${NC}"
        break
    fi

    echo -e "${YELLOW}→ Waiting for PostgreSQL... (${WAITED}s/${MAX_WAIT}s)${NC}"
    sleep 2
    WAITED=$((WAITED + 2))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}✗ PostgreSQL health check timeout${NC}"
    echo -e "${YELLOW}  Check logs: npm run docker:postgres:log${NC}"
    exit 1
fi
echo ""

# ==============================================================================
# Step 4: Wait for Redis Health Check
# ==============================================================================
echo -e "${BLUE}═══ Step 4/6: Waiting for Redis Health Check ═══${NC}"

MAX_WAIT=30
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_REDIS_NAME" 2>/dev/null || echo "none")

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✓ Redis is healthy${NC}"
        break
    fi

    echo -e "${YELLOW}→ Waiting for Redis... (${WAITED}s/${MAX_WAIT}s)${NC}"
    sleep 2
    WAITED=$((WAITED + 2))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${RED}✗ Redis health check timeout${NC}"
    echo -e "${YELLOW}  Check logs: npm run docker:redis:log${NC}"
    exit 1
fi
echo ""

# ==============================================================================
# Step 5: Development Database Setup
# ==============================================================================
echo -e "${BLUE}═══ Step 5/6: Development Database Setup ═══${NC}"

# Run migrations on development database
echo -e "${YELLOW}→ Running migrations on development database...${NC}"
npm run db:migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
    echo -e "${RED}✗ Failed to apply migrations${NC}"
    exit 1
fi
echo ""

# Seed superadmin + API keys
echo -e "${YELLOW}→ Seeding superadmin + API keys...${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
npm run db:seed:superadmin
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Superadmin + API keys seeded${NC}"
    echo -e "${YELLOW}⚠  IMPORTANT: Copy the API keys above and add to .env files${NC}"
else
    echo -e "${RED}✗ Failed to seed data${NC}"
    exit 1
fi
echo ""

# ==============================================================================
# Step 6: Test Database Setup
# ==============================================================================
echo -e "${BLUE}═══ Step 6/6: Test Database Setup ═══${NC}"

npm run test:db:setup

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test database ready${NC}"
else
    echo -e "${RED}✗ Failed to setup test database${NC}"
    exit 1
fi
echo ""

# ==============================================================================
# Success Summary
# ==============================================================================
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ✓ Development Environment Ready                         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Services Status:${NC}"
echo -e "  ${GREEN}✓${NC} PostgreSQL running"
echo -e "  ${GREEN}✓${NC} Redis running"
echo -e "  ${GREEN}✓${NC} Development database migrated"
echo -e "  ${GREEN}✓${NC} Superadmin + API keys seeded"
echo -e "  ${GREEN}✓${NC} Test database ready"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  ${CYAN}1.${NC} Verify API keys in root ${YELLOW}.env${NC} (VITE_ADMIN_PANEL_API_KEY)"
echo -e "  ${CYAN}2.${NC} Start development: ${GREEN}npm run dev${NC}"
echo -e "  ${CYAN}3.${NC} Run tests: ${GREEN}npm test${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  ${CYAN}→${NC} View logs: ${GREEN}npm run docker:logs${NC}"
echo -e "  ${CYAN}→${NC} Database shell: ${GREEN}npm run docker:postgres:exec${NC}"
echo -e "  ${CYAN}→${NC} Redis CLI: ${GREEN}npm run docker:redis:exec${NC}"
echo ""
