#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_CADDY_NAME:-fastify-oauth-caddy}"

echo "Showing logs for Caddy container: $CONTAINER_NAME"
echo "Press Ctrl+C to exit"
echo "=========================================="

docker compose logs -f caddy
