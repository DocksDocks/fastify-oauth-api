#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "${BLUE}Stopping Fastify OAuth API Stack${NC}"
echo "=========================================="

echo "\n${YELLOW}→${NC} Stopping all services..."
docker compose stop

echo "\n${GREEN}✓ All services stopped${NC}"
echo "=========================================="

docker compose ps
