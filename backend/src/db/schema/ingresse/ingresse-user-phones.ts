import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ingresseUsers } from './ingresse-users';

/**
 * Ingresse User Phones Table
 * Stores phone numbers for Ingresse users
 * Many-to-one relationship with ingresse_users table
 */
export const ingresseUserPhones = pgTable('ingresse_user_phones', {
  id: serial('id').primaryKey(),

  // Foreign key to ingresse_users table
  ingresseUserId: integer('ingresse_user_id')
    .notNull()
    .references(() => ingresseUsers.id, { onDelete: 'cascade' }),

  // Phone data
  ddi: integer('ddi').notNull(), // Direct Dial In (country code)
  number: text('number').notNull(), // Phone number

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ingresse User Phones Relations
 * Many-to-one relationship with ingresse_users
 */
export const ingresseUserPhonesRelations = relations(ingresseUserPhones, ({ one }) => ({
  ingresseUser: one(ingresseUsers, {
    fields: [ingresseUserPhones.ingresseUserId],
    references: [ingresseUsers.id],
  }),
}));

// Type exports for TypeScript
export type IngresseUserPhone = typeof ingresseUserPhones.$inferSelect;
export type NewIngresseUserPhone = typeof ingresseUserPhones.$inferInsert;
