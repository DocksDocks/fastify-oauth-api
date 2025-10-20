#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_REDIS_NAME:-fastify-oauth-redis}"

echo "Showing logs for Redis container: $CONTAINER_NAME"
echo "Press Ctrl+C to exit"
echo "=========================================="

docker compose logs -f redis
