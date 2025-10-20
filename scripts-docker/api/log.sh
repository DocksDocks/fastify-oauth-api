#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_API_NAME:-fastify-oauth-api}"

echo "Showing logs for API container: $CONTAINER_NAME"
echo "Press Ctrl+C to exit"
echo "=========================================="

docker compose logs -f api
