#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_REDIS_NAME:-fastify-oauth-redis}"

echo "Stopping Redis container: $CONTAINER_NAME"
docker compose stop redis

echo "✓ Redis container stopped"
