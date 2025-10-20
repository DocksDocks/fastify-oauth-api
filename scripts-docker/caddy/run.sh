#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_CADDY_NAME:-fastify-oauth-caddy}"

echo "Starting Caddy container: $CONTAINER_NAME"
docker compose up -d caddy

echo "✓ Caddy container started"
echo "→ View logs: docker compose logs -f caddy"
echo "→ Check health: docker compose ps caddy"
