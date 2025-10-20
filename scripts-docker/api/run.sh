#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_API_NAME:-fastify-oauth-api}"

echo "Starting API container: $CONTAINER_NAME"
docker compose up -d api

echo "✓ API container started"
echo "→ View logs: docker compose logs -f api"
echo "→ Check health: docker compose ps api"
