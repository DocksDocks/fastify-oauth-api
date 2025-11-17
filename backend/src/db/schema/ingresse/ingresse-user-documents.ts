import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ingresseUsers } from './ingresse-users';

/**
 * Ingresse User Documents Table
 * Stores identification documents for Ingresse users (CPF, Passport, etc.)
 * Many-to-one relationship with ingresse_users table
 * Document numbers are encrypted using AES-256-CBC for security
 */
export const ingresseUserDocuments = pgTable('ingresse_user_documents', {
  id: serial('id').primaryKey(),

  // Foreign key to ingresse_users table
  ingresseUserId: integer('ingresse_user_id')
    .notNull()
    .references(() => ingresseUsers.id, { onDelete: 'cascade' }),

  // Document data
  type: integer('type').notNull(), // 1 = CPF, 2 = PASSPORT
  numberEncrypted: text('number_encrypted').notNull(), // Encrypted document number (AES-256-CBC)

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ingresse User Documents Relations
 * Many-to-one relationship with ingresse_users
 */
export const ingresseUserDocumentsRelations = relations(ingresseUserDocuments, ({ one }) => ({
  ingresseUser: one(ingresseUsers, {
    fields: [ingresseUserDocuments.ingresseUserId],
    references: [ingresseUsers.id],
  }),
}));

// Type exports for TypeScript
export type IngresseUserDocument = typeof ingresseUserDocuments.$inferSelect;
export type NewIngresseUserDocument = typeof ingresseUserDocuments.$inferInsert;
