#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_POSTGRES_NAME:-fastify-oauth-postgres}"

echo "Showing logs for PostgreSQL container: $CONTAINER_NAME"
echo "Press Ctrl+C to exit"
echo "=========================================="

docker compose logs -f postgres
