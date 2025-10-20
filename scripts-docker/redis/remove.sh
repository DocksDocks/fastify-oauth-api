#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_REDIS_NAME:-fastify-oauth-redis}"

echo "Removing Redis container: $CONTAINER_NAME"
echo "WARNING: This will stop and remove the container (data in volumes will persist)"
echo ""
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled"
    exit 0
fi

docker compose rm -s -f redis

echo "✓ Redis container removed"
echo "→ Data persists in volume: fastify_oauth_redis_data"
echo "→ To remove volume: docker volume rm fastify_oauth_redis_data"
