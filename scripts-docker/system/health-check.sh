#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "=========================================="
echo "${BLUE}Fastify OAuth API - Health Check${NC}"
echo "=========================================="

check_service() {
    service=$1
    container_var=$2
    container_name=$(eval echo \$$container_var)
    
    printf "\n${YELLOW}→${NC} Checking $service... "
    
    if docker compose ps $service | grep -q "Up"; then
        if docker compose ps $service | grep -q "healthy"; then
            echo "${GREEN}✓ Healthy${NC}"
            return 0
        elif docker compose ps $service | grep -q "unhealthy"; then
            echo "${RED}✗ Unhealthy${NC}"
            return 1
        else
            echo "${YELLOW}⚠ Running (no health check)${NC}"
            return 0
        fi
    else
        echo "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Check all services
check_service "postgres" "CONTAINER_POSTGRES_NAME"
postgres_status=$?

check_service "redis" "CONTAINER_REDIS_NAME"
redis_status=$?

check_service "api" "CONTAINER_API_NAME"
api_status=$?

check_service "caddy" "CONTAINER_CADDY_NAME"
caddy_status=$?

echo "\n=========================================="
echo "${BLUE}Container Status:${NC}"
echo "=========================================="
docker compose ps

# Overall status
echo "\n=========================================="
if [ $postgres_status -eq 0 ] && [ $redis_status -eq 0 ] && [ $api_status -eq 0 ] && [ $caddy_status -eq 0 ]; then
    echo "${GREEN}✓ All services are healthy${NC}"
    exit 0
else
    echo "${RED}✗ Some services are not healthy${NC}"
    exit 1
fi
