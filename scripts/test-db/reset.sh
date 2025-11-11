#!/bin/bash

# ==============================================================================
# Reset Test Database
# ==============================================================================
# Drops and recreates the test database (clean slate)
# Usage: pnpm test:db:reset OR bash scripts/test-db/reset.sh
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Resetting Test Database${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Drop test database
echo -e "${YELLOW}Step 1/2: Dropping test database...${NC}"
bash "$SCRIPT_DIR/drop.sh"
echo ""

# Step 2: Create test database
echo -e "${YELLOW}Step 2/2: Creating test database...${NC}"
bash "$SCRIPT_DIR/create.sh"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Test database reset completed${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  ${GREEN}→${NC} Run migrations: ${YELLOW}pnpm test:db:migrate${NC}"
echo -e "  ${GREEN}→${NC} Or full setup: ${YELLOW}pnpm test:db:setup${NC}"
