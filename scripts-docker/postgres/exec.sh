#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_POSTGRES_NAME:-fastify-oauth-postgres}"
DATABASE_USER="${DATABASE_USER:-postgres}"
DATABASE_NAME="${DATABASE_NAME:-fastify_oauth_db}"

echo "Opening PostgreSQL shell in container: $CONTAINER_NAME"
echo "Database: $DATABASE_NAME"
echo "User: $DATABASE_USER"
echo "=========================================="

docker compose exec postgres psql -U "$DATABASE_USER" -d "$DATABASE_NAME"
