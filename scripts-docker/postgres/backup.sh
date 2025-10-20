#!/bin/sh
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

CONTAINER_NAME="${CONTAINER_POSTGRES_NAME:-fastify-oauth-postgres}"
BACKUP_DIR="./scripts-docker/system/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="postgres_backup_${TIMESTAMP}.sql.gz"

echo "=========================================="
echo "PostgreSQL Backup"
echo "=========================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if container is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo "✗ PostgreSQL container is not running"
    exit 1
fi

echo "→ Creating backup: $BACKUP_FILE"

# Create backup
docker compose exec -T postgres pg_dump -U "${DATABASE_USER:-postgres}" -d "${DATABASE_NAME:-fastify_oauth_db}" | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "✓ Backup created successfully"
    echo "  Location: ${BACKUP_DIR}/${BACKUP_FILE}"
    echo "  Size: $SIZE"
else
    echo "✗ Backup failed"
    exit 1
fi

# List recent backups
echo ""
echo "→ Recent backups:"
ls -lht "${BACKUP_DIR}"/postgres_backup_*.sql.gz 2>/dev/null | head -5 || echo "  No backups found"

echo "=========================================="
echo "✓ Backup completed"
echo "=========================================="
