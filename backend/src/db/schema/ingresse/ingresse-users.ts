import { pgTable, serial, integer, text, date, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../users';
import { ingresseUserPhones } from './ingresse-user-phones';
import { ingresseUserAddresses } from './ingresse-user-addresses';
import { ingresseUserDocuments } from './ingresse-user-documents';

/**
 * Ingresse Users Table
 * Stores Ingresse ticketing platform account data linked to system users
 * One-to-one relationship with users table
 */
export const ingresseUsers = pgTable('ingresse_users', {
  id: serial('id').primaryKey(),

  // Foreign key to users table (one-to-one)
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),

  // Ingresse platform user ID
  ingresseUserId: text('ingresse_user_id').notNull().unique(),

  // Encrypted authentication tokens
  token: text('token').notNull(), // User token (encrypted)
  authToken: text('auth_token'), // JWT auth token (encrypted, nullable)

  // User profile data
  name: text('name'),
  email: text('email'),
  birthdate: date('birthdate'),
  nationality: varchar('nationality', { length: 3 }), // ISO 3166-1 alpha-3 (e.g., BRA, USA)
  gender: varchar('gender', { length: 1 }), // M, F, O (other)

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ingresse Users Relations
 * Defines relationships with users, phones, addresses, and documents tables
 */
export const ingresseUsersRelations = relations(ingresseUsers, ({ one, many }) => ({
  // One-to-one with system users
  user: one(users, {
    fields: [ingresseUsers.userId],
    references: [users.id],
  }),

  // One-to-many with related tables
  phones: many(ingresseUserPhones),
  addresses: many(ingresseUserAddresses),
  documents: many(ingresseUserDocuments),
}));

// Type exports for TypeScript
export type IngresseUser = typeof ingresseUsers.$inferSelect;
export type NewIngresseUser = typeof ingresseUsers.$inferInsert;
