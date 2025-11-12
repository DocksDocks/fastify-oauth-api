/**
 * Automatic Database Migration Script
 * Runs migrations before server startup in development mode
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations(): Promise<void> {
  const connectionString = `postgres://${process.env.DATABASE_USER || 'postgres'}:${process.env.DATABASE_PASSWORD || 'postgres'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME || 'fastify_oauth_db'}`;

  let migrationClient;

  try {
    console.log('🔄 Checking for pending database migrations...');

    // Create a dedicated migration client
    migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient);

    // Run migrations from the migrations folder
    const migrationsFolder = join(__dirname, 'migrations');
    await migrate(db, { migrationsFolder });

    console.log('✅ Database migrations completed successfully!');
  } catch (error) {
    if (error instanceof Error) {
      // Check if error is "no migrations to run"
      if (error.message.includes('No migrations to run')) {
        console.log('✅ Database is up to date - no migrations needed');
      } else {
        console.error('❌ Migration failed:', error.message);
        throw error;
      }
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } finally {
    // Always close the migration client
    if (migrationClient) {
      await migrationClient.end();
    }
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

export { runMigrations };
