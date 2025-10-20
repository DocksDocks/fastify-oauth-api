#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_POSTGRES_NAME:-fastify-oauth-postgres}"

echo "Stopping PostgreSQL container: $CONTAINER_NAME"
docker compose stop postgres

echo "✓ PostgreSQL container stopped"
