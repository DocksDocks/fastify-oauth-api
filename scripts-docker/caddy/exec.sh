#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_CADDY_NAME:-fastify-oauth-caddy}"

echo "Opening shell in Caddy container: $CONTAINER_NAME"
echo "=========================================="

docker compose exec caddy sh
