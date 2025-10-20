#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "${RED}WARNING: Remove All Containers${NC}"
echo "=========================================="
echo "${YELLOW}This will stop and remove all containers.${NC}"
echo "${YELLOW}Volumes will be preserved.${NC}"
echo ""
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled"
    exit 0
fi

echo "\n${YELLOW}→${NC} Stopping and removing all containers..."
docker compose down

echo "\n${GREEN}✓ All containers removed${NC}"
echo "→ Volumes preserved: fastify_oauth_*_data"
echo "→ To remove volumes: bash scripts-docker/system/remove-volumes.sh"
