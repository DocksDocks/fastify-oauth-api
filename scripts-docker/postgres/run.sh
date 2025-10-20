#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_POSTGRES_NAME:-fastify-oauth-postgres}"

echo "Starting PostgreSQL container: $CONTAINER_NAME"
docker compose up -d postgres

echo "✓ PostgreSQL container started"
echo "→ View logs: docker compose logs -f postgres"
echo "→ Check health: docker compose ps postgres"
