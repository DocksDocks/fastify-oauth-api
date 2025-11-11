#!/bin/bash

# ==============================================================================
# Setup Test Database
# ==============================================================================
# Complete test database setup: create + migrate + verify
# Usage: pnpm test:db:setup OR bash scripts/test-db/setup.sh
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Set defaults if not in .env
CONTAINER_NAME="${CONTAINER_POSTGRES_NAME:-fastify-oauth-postgres}"
DB_NAME="${DATABASE_NAME:-fastify_oauth_db}"
DB_USER="${DATABASE_USER:-postgres}"
TEST_DB_NAME="${DB_NAME}_test"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Test Database Complete Setup        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}✗ PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    echo -e "${YELLOW}  Start it with: pnpm docker:postgres${NC}"
    exit 1
fi

echo -e "${CYAN}→ Container:${NC} ${CONTAINER_NAME}"
echo -e "${CYAN}→ Database:${NC} ${TEST_DB_NAME}"
echo ""

# Check if test database already exists
DB_EXISTS=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${TEST_DB_NAME}'")

if [ -n "$DB_EXISTS" ]; then
    echo -e "${YELLOW}⚠ Test database already exists${NC}"
    echo -e "${YELLOW}  Do you want to reset it? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo ""
        bash "$SCRIPT_DIR/reset.sh"
        echo ""
    else
        echo -e "${BLUE}→ Skipping database recreation${NC}"
        echo ""
    fi
else
    # Step 1: Create test database
    echo -e "${BLUE}═══ Step 1/3: Creating Database ═══${NC}"
    bash "$SCRIPT_DIR/create.sh"
    echo ""
fi

# Step 2: Run migrations
echo -e "${BLUE}═══ Step 2/3: Running Migrations ═══${NC}"
bash "$SCRIPT_DIR/migrate.sh"
echo ""

# Step 3: Verify setup
echo -e "${BLUE}═══ Step 3/3: Verifying Setup ═══${NC}"
echo -e "${YELLOW}Checking database tables...${NC}"

TABLE_COUNT=$(docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TEST_DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found ${TABLE_COUNT} tables${NC}"

    # List tables
    echo -e "${CYAN}Tables in ${TEST_DB_NAME}:${NC}"
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TEST_DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" | grep -v "row\|table_name\|---\|^$"
else
    echo -e "${RED}✗ No tables found - migration may have failed${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   ✓ Setup Completed Successfully      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Test database is ready!${NC}"
echo -e "${YELLOW}Run tests with: ${CYAN}pnpm test${NC}"
