#!/bin/sh
set -e

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "${BLUE}Restarting Fastify OAuth API Stack${NC}"
echo "=========================================="

# Stop all services
bash scripts-docker/system/stop-all.sh

# Wait a moment
sleep 2

# Start all services
bash scripts-docker/system/start-all.sh
