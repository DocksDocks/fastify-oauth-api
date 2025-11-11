/**
 * Authorized Admins Schema
 *
 * Stores pre-authorized admin emails. When users with these emails
 * sign up via OAuth, they are automatically promoted to admin role.
 */

import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const authorizedAdmins = pgTable('authorized_admins', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// Types
export type AuthorizedAdmin = typeof authorizedAdmins.$inferSelect;
export type NewAuthorizedAdmin = typeof authorizedAdmins.$inferInsert;
