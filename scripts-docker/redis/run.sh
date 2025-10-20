#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_REDIS_NAME:-fastify-oauth-redis}"

echo "Starting Redis container: $CONTAINER_NAME"
docker compose up -d redis

echo "✓ Redis container started"
echo "→ View logs: docker compose logs -f redis"
echo "→ Check health: docker compose ps redis"
