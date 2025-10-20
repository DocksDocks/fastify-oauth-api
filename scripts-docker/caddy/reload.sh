#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_CADDY_NAME:-fastify-oauth-caddy}"

echo "Reloading Caddy configuration in container: $CONTAINER_NAME"
echo "=========================================="

docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile

echo "✓ Caddy configuration reloaded"
