#!/bin/bash

# ==============================================================================
# Drop Test Database
# ==============================================================================
# Drops the test database if it exists
# Usage: pnpm test:db:drop OR bash scripts/test-db/drop.sh
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Dropping Test Database${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}✗ PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    echo -e "${YELLOW}  Start it with: pnpm docker:postgres${NC}"
    exit 1
fi

echo -e "${YELLOW}→ Container: ${CONTAINER_NAME}${NC}"
echo -e "${YELLOW}→ Test Database: ${TEST_DB_NAME}${NC}"
echo ""

# Terminate active connections to test database
echo -e "${YELLOW}Terminating active connections...${NC}"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres <<-EOSQL
    -- Terminate all connections to the test database
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${TEST_DB_NAME}'
      AND pid <> pg_backend_pid();
EOSQL

# Drop test database
echo -e "${YELLOW}Dropping test database...${NC}"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres <<-EOSQL
    -- Drop test database if it exists
    DROP DATABASE IF EXISTS ${TEST_DB_NAME};
EOSQL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test database dropped: ${TEST_DB_NAME}${NC}"
else
    echo -e "${RED}✗ Failed to drop test database${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Test database dropped successfully${NC}"
echo -e "${BLUE}========================================${NC}"
