#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_CADDY_NAME:-fastify-oauth-caddy}"

echo "Stopping Caddy container: $CONTAINER_NAME"
docker compose stop caddy

echo "✓ Caddy container stopped"
