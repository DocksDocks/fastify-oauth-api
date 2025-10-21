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
 */
export async function truncateAllTables(): Promise<void> {
  try {
    // Use raw client for TRUNCATE to avoid Drizzle ORM issues
    await client`
      TRUNCATE TABLE
        notifications,
        refresh_tokens,
        set_logs,
        workout_logs,
        user_coaches,
        workout_shares,
        workout_exercises,
        workouts,
        exercises,
        users
      RESTART IDENTITY CASCADE
    `;
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
