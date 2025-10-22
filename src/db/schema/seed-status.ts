/**
 * Seed Status Schema
 *
 * Tracks which database seeds have been executed
 * Prevents duplicate seed runs (e.g., super admin creation)
 */

import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const seedStatus = pgTable('seed_status', {
  id: serial('id').primaryKey(),
  seedName: text('seed_name').notNull().unique(), // e.g., 'super-admin-seed'
  ranAt: timestamp('ran_at', { withTimezone: true }).notNull().defaultNow(),
  success: boolean('success').notNull().default(true),
});

export type SeedStatus = typeof seedStatus.$inferSelect;
export type NewSeedStatus = typeof seedStatus.$inferInsert;
