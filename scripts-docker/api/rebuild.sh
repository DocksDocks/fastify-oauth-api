#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_API_NAME:-fastify-oauth-api}"

echo "Rebuilding and restarting API container: $CONTAINER_NAME"
echo "=========================================="

docker compose stop api
docker compose rm -f api
docker compose build --no-cache api
docker compose up -d api

echo "✓ API container rebuilt and started"
echo "→ View logs: docker compose logs -f api"
