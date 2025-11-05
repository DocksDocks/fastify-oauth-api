import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import env from '@/config/env';

// Use separate database for tests
const testDatabaseName = `${env.DATABASE_NAME}_test`;
const connectionString = `postgresql://${env.DATABASE_USER}:${env.DATABASE_PASSWORD}@${env.DATABASE_HOST}:${env.DATABASE_PORT}/${testDatabaseName}`;

// Create test database client
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance for tests
export const testDb = drizzle(client, { schema });

/**
 * Run migrations on test database
 */
export async function runMigrations(): Promise<void> {
  await migrate(testDb, { migrationsFolder: './src/db/migrations' });
}

/**
 * Truncate all tables in test database
 * Dynamically queries for all tables and truncates them
 */
export async function truncateAllTables(): Promise<void> {
  try {
    // Get all table names from the public schema (excluding Drizzle internal tables)
    const tables = await client<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE '__drizzle%'
    `;

    if (tables.length === 0) {
      return; // No tables to truncate
    }

    // Build comma-separated list of table names
    const tableNames = tables.map((t) => t.tablename).join(', ');

    // Truncate all tables in one command
    await client.unsafe(`
      TRUNCATE TABLE ${tableNames}
      RESTART IDENTITY CASCADE
    `);
  } catch (error) {
    console.error('Failed to truncate tables:', error);
    throw error;
  }
}

/**
 * Close test database connection
 */
export async function closeTestDb(): Promise<void> {
  await client.end();
}

export default testDb;
