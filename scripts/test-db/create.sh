#!/bin/bash

# ==============================================================================
# Create Test Database
# ==============================================================================
# Creates the test database if it doesn't exist
# Usage: pnpm test:db:create OR bash scripts/test-db/create.sh
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
echo -e "${BLUE}Creating Test Database${NC}"
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

# Create test database
echo -e "${YELLOW}Creating test database...${NC}"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres <<-EOSQL
    -- Create test database if it doesn't exist
    SELECT 'CREATE DATABASE ${TEST_DB_NAME}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${TEST_DB_NAME}')\gexec
EOSQL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test database created: ${TEST_DB_NAME}${NC}"
else
    echo -e "${RED}✗ Failed to create test database${NC}"
    exit 1
fi

# Create extensions on test database
echo -e "${YELLOW}Setting up extensions...${NC}"
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$TEST_DB_NAME" <<-EOSQL
    -- UUID extension for generating UUIDs
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- pgcrypto for encryption functions
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- pg_trgm for similarity and pattern matching
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- citext for case-insensitive text
    CREATE EXTENSION IF NOT EXISTS "citext";
EOSQL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Extensions created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create extensions${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Test database creation completed${NC}"
echo -e "${BLUE}========================================${NC}"
