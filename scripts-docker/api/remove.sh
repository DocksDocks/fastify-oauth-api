#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_API_NAME:-fastify-oauth-api}"

echo "Removing API container: $CONTAINER_NAME"
echo "WARNING: This will stop and remove the container"
echo ""
read -p "Are you sure? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled"
    exit 0
fi

docker compose rm -s -f api

echo "✓ API container removed"
