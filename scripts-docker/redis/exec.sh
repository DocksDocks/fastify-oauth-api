#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_REDIS_NAME:-fastify-oauth-redis}"

echo "Opening Redis CLI in container: $CONTAINER_NAME"
echo "=========================================="

docker compose exec redis redis-cli
