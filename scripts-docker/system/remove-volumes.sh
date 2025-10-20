#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "${RED}DANGER: Remove All Containers AND Volumes${NC}"
echo "=========================================="
echo "${RED}This will PERMANENTLY DELETE all data!${NC}"
echo "${YELLOW}This action CANNOT be undone!${NC}"
echo ""
echo "This will remove:"
echo "  • All containers"
echo "  • All volumes (PostgreSQL data, Redis data, Caddy certificates)"
echo "  • All networks"
echo ""
read -p "Type 'DELETE' to confirm: " confirm

if [ "$confirm" != "DELETE" ]; then
    echo "Cancelled"
    exit 0
fi

echo "\n${RED}→${NC} Removing all containers, volumes, and networks..."
docker compose down -v

echo "\n${RED}✓ All containers, volumes, and networks removed${NC}"
echo "${RED}✗ All data has been permanently deleted${NC}"
