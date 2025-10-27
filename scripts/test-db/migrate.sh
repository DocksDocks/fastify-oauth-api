#!/bin/bash

# ==============================================================================
# Migrate Test Database
# ==============================================================================
# Applies all migrations to the test database
# Usage: npm run test:db:migrate OR bash scripts/test-db/migrate.sh
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
TEST_DB_NAME="${DB_NAME}_test"
MIGRATIONS_DIR="$PROJECT_ROOT/src/db/migrations"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Migrating Test Database${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}✗ PostgreSQL container '${CONTAINER_NAME}' is not running${NC}"
    echo -e "${YELLOW}  Start it with: npm run docker:postgres${NC}"
    exit 1
fi

echo -e "${YELLOW}→ Container: ${CONTAINER_NAME}${NC}"
echo -e "${YELLOW}→ Test Database: ${TEST_DB_NAME}${NC}"
echo -e "${YELLOW}→ Migrations Directory: ${MIGRATIONS_DIR}${NC}"
echo ""

# Check if test database exists
DB_EXISTS=$(docker exec -i "$CONTAINER_NAME" psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${TEST_DB_NAME}'")

if [ -z "$DB_EXISTS" ]; then
    echo -e "${RED}✗ Test database '${TEST_DB_NAME}' does not exist${NC}"
    echo -e "${YELLOW}  Create it with: npm run test:db:create${NC}"
    exit 1
fi

# Run migrations using drizzle-kit with test database
echo -e "${YELLOW}Running migrations...${NC}"
cd "$PROJECT_ROOT"

# Temporarily override DATABASE_NAME for migration
export DATABASE_NAME="${TEST_DB_NAME}"
npm run db:migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
    echo -e "${RED}✗ Failed to apply migrations${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Test database migration completed${NC}"
echo -e "${BLUE}========================================${NC}"
