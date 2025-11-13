#!/usr/bin/env bash

# Cleanup Test Tables Script
#
# Removes test tables that may have been left behind from test runs
# Uses Drizzle ORM via TypeScript

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$BACKEND_DIR")"

# Load environment variables from root .env
if [ -f "$ROOT_DIR/.env" ]; then
  export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)
fi

# Run the TypeScript cleanup script
cd "$BACKEND_DIR"
npx tsx scripts/cleanup-test-tables.ts
