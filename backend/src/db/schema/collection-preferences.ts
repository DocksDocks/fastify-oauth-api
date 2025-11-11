/**
 * Collection Preferences Schema
 *
 * Stores admin-configurable column visibility preferences for each collection.
 * These preferences apply globally to all admins (not per-user).
 */

import { pgTable, serial, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Collection Preferences Table
 *
 * Each row represents the column visibility configuration for a specific collection.
 * Only one row per collection table.
 */
export const collectionPreferences = pgTable('collection_preferences', {
  id: serial('id').primaryKey(),

  // Collection identifier (e.g., 'users', 'provider_accounts')
  tableName: text('table_name').notNull().unique(),

  // Array of column names to display (in order)
  // Example: ["id", "email", "name", "role"]
  visibleColumns: jsonb('visible_columns').notNull().$type<string[]>(),

  // Admin who last updated this preference
  updatedBy: serial('updated_by').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Timestamp of last update
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

  // Timestamp of creation
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CollectionPreference = typeof collectionPreferences.$inferSelect;
export type NewCollectionPreference = typeof collectionPreferences.$inferInsert;
