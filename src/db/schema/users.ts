import { pgTable, serial, varchar, text, timestamp, pgEnum, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userPreferences } from './user-preferences';

export const providerEnum = pgEnum('provider', ['google', 'apple', 'system']);
export const roleEnum = pgEnum('role', ['user', 'admin', 'superadmin']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatar: text('avatar'),
  primaryProviderAccountId: integer('primary_provider_account_id'), // FK to provider_accounts table
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
}, (table) => ({
  primaryProviderAccountIdIdx: index('idx_users_primary_provider_account_id').on(table.primaryProviderAccountId),
}));

// Relations (forward reference to avoid circular dependency)
export const usersRelations = relations(users, ({ one }) => ({
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
