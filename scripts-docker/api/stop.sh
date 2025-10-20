#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_API_NAME:-fastify-oauth-api}"

echo "Stopping API container: $CONTAINER_NAME"
docker compose stop api

echo "✓ API container stopped"
