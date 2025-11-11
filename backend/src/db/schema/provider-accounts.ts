/**
 * Provider Accounts Schema
 * Stores OAuth provider connections for each user (many-to-many relationship)
 */

import { pgTable, serial, integer, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { users, providerEnum } from './users';

/**
 * Provider Accounts Table
 * Each row represents one OAuth provider linked to a user account
 */
export const providerAccounts = pgTable(
  'provider_accounts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: providerEnum('provider').notNull(),
    providerId: text('provider_id').notNull(),
    email: text('email').notNull(), // Provider-specific email (may differ from user.email)
    name: text('name'), // Provider-specific name
    avatar: text('avatar'), // Provider-specific avatar URL
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Ensure each provider account is unique across the entire system
    uniqueProviderAccount: unique('unique_provider_account').on(table.provider, table.providerId),
    // Ensure a user can only link each provider once
    uniqueUserProvider: unique('unique_user_provider').on(table.userId, table.provider),
  })
);

/**
 * Type for provider account (inferred from schema)
 */
export type ProviderAccount = typeof providerAccounts.$inferSelect;

/**
 * Type for creating a new provider account
 */
export type NewProviderAccount = typeof providerAccounts.$inferInsert;
