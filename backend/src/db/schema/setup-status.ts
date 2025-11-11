import { pgTable, serial, boolean, timestamp } from 'drizzle-orm/pg-core';

export const setupStatus = pgTable('setup_status', {
  id: serial('id').primaryKey(),
  isSetupComplete: boolean('is_setup_complete').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export type SetupStatus = typeof setupStatus.$inferSelect;
export type NewSetupStatus = typeof setupStatus.$inferInsert;
