import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { runMigrations, truncateAllTables, closeTestDb, testDb } from './test-db';

// Mock the database client to use test database
vi.mock('@/db/client', () => ({
  db: testDb,
}));

// Run migrations before all tests
beforeAll(async () => {
  console.log('Running test database migrations...');
  await runMigrations();
  console.log('Cleaning up existing test data...');
  await truncateAllTables();
  console.log('Test database ready');
});

// Clean up database after each test
afterEach(async () => {
  await truncateAllTables();
});

// Close database connection after all tests
afterAll(async () => {
  console.log('Closing test database connection...');
  await closeTestDb();
});
