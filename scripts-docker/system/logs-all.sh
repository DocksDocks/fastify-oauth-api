#!/bin/sh
set -e

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "${BLUE}Showing logs for all services${NC}"
echo "=========================================="
echo "Press Ctrl+C to exit"
echo ""

docker compose logs -f
