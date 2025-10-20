#!/bin/bash
set -e

echo "=========================================="
echo "Initializing Fastify OAuth API Database"
echo "=========================================="

# Create extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- UUID extension for generating UUIDs
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- pgcrypto for encryption functions
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- pg_trgm for similarity and pattern matching
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- citext for case-insensitive text
    CREATE EXTENSION IF NOT EXISTS "citext";

    -- Display installed extensions
    SELECT extname AS "Extension", extversion AS "Version"
    FROM pg_extension
    WHERE extname NOT IN ('plpgsql')
    ORDER BY extname;
EOSQL

echo "✓ Database extensions created successfully"

# Create schemas if needed (optional)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create public schema if not exists (usually already exists)
    CREATE SCHEMA IF NOT EXISTS public;

    -- Grant usage on schema
    GRANT USAGE ON SCHEMA public TO "$POSTGRES_USER";
    GRANT CREATE ON SCHEMA public TO "$POSTGRES_USER";
EOSQL

echo "✓ Database schemas configured successfully"

# Display database information
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT
        current_database() AS "Database",
        current_user AS "Current User",
        version() AS "PostgreSQL Version";
EOSQL

echo "=========================================="
echo "✓ Database initialization completed"
echo "=========================================="
