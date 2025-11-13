#!/usr/bin/env tsx

/**
 * Cleanup Test Tables Script
 *
 * Removes any test tables that may have been left behind from test runs.
 * Uses Drizzle ORM to safely drop tables.
 *
 * Usage:
 *   From backend dir: npx dotenvx run --env-file=../.env -- tsx scripts/cleanup-test-tables.ts
 *   From root dir: npx dotenvx run -- tsx backend/scripts/cleanup-test-tables.ts
 */

import { db } from '../src/db/client.js';
import { sql } from 'drizzle-orm';
import { logger } from '../src/utils/logger.js';

const TEST_TABLE_NAMES = [
  'blog_posts',
  'products',
  'articles',
  'custom_test_collection',
];

/**
 * Validate table name to prevent SQL injection
 * Even though we use hardcoded values, this protects against future refactoring risks
 */
function validateTableName(name: string): void {
  // PostgreSQL identifier rules: lowercase letters, digits, and underscores only
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: "${name}". Must match pattern: ^[a-z_][a-z0-9_]*$`);
  }

  // PostgreSQL identifier length limit
  if (name.length > 63) {
    throw new Error(`Table name too long: "${name}". Maximum length is 63 characters`);
  }
}

async function cleanupTestTables(): Promise<void> {
  try {
    logger.info('Checking for test tables to clean up...');

    for (const tableName of TEST_TABLE_NAMES) {
      try {
        // Validate table name (defense-in-depth even with hardcoded values)
        validateTableName(tableName);

        // Check if table exists using Drizzle SQL template
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
          );
        `);

        // Handle different result structures from Drizzle
        const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;

        if (!rows || rows.length === 0) {
          logger.warn(`No result for table check: ${tableName}`);
          continue;
        }

        const exists = (rows[0] as { exists: boolean }).exists;

        if (exists) {
          logger.info(`Dropping test table: ${tableName}`);

          // Drop the table using sql.identifier() for safe identifier escaping
          // Note: sql.identifier() returns a SQL fragment, so we wrap it in sql`` template
          await db.execute(
            sql`DROP TABLE IF EXISTS ${sql.identifier(tableName)} CASCADE`
          );

          logger.info(`✓ Dropped table: ${tableName}`);
        } else {
          logger.info(`✓ Table does not exist: ${tableName}`);
        }
      } catch (error) {
        logger.error({ err: error, table: tableName }, `Failed to process table: ${tableName}`);
      }
    }

    logger.info('Test table cleanup completed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanup test tables');
    throw error;
  }
}

// Run cleanup
cleanupTestTables()
  .then(() => {
    logger.info('Cleanup script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ err: error }, 'Cleanup script failed');
    process.exit(1);
  });
