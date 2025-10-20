#!/bin/bash
set -e

# Internal backup script for PostgreSQL
# This script runs INSIDE the container

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="postgres_backup_${TIMESTAMP}.sql.gz"
MAX_BACKUPS=7

echo "=========================================="
echo "Starting PostgreSQL Backup"
echo "=========================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "→ Creating backup: $BACKUP_FILE"
pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully: ${BACKUP_DIR}/${BACKUP_FILE}"

    # Get file size
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "  Size: $SIZE"
else
    echo "✗ Backup failed"
    exit 1
fi

# Clean up old backups (keep only last MAX_BACKUPS)
echo "→ Cleaning up old backups (keeping last $MAX_BACKUPS)..."
cd "$BACKUP_DIR"
ls -t postgres_backup_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f

# List remaining backups
echo "→ Current backups:"
ls -lh postgres_backup_*.sql.gz 2>/dev/null || echo "  No backups found"

echo "=========================================="
echo "✓ Backup completed"
echo "=========================================="
