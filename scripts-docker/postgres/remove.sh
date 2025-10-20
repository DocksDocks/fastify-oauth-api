#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_POSTGRES_NAME:-fastify-oauth-postgres}"

echo "Removing PostgreSQL container: $CONTAINER_NAME"
echo "WARNING: This will stop and remove the container (data in volumes will persist)"
echo ""
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled"
    exit 0
fi

docker compose rm -s -f postgres

echo "✓ PostgreSQL container removed"
echo "→ Data persists in volume: fastify_oauth_postgres_data"
echo "→ To remove volume: docker volume rm fastify_oauth_postgres_data"
