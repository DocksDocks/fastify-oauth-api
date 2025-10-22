/**
 * API Keys Schema
 *
 * Stores global API keys for mobile apps and admin panel
 * Keys are hashed before storage for security
 */

import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // 'ios_api_key', 'android_api_key', 'admin_panel_api_key'
  keyHash: text('key_hash').notNull(), // bcrypt hash of actual key
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }), // null = active, set = revoked
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
