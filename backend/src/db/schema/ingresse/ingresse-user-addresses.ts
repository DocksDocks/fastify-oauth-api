import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ingresseUsers } from './ingresse-users';

/**
 * Ingresse User Addresses Table
 * Stores address information for Ingresse users
 * Many-to-one relationship with ingresse_users table
 */
export const ingresseUserAddresses = pgTable('ingresse_user_addresses', {
  id: serial('id').primaryKey(),

  // Foreign key to ingresse_users table
  ingresseUserId: integer('ingresse_user_id')
    .notNull()
    .references(() => ingresseUsers.id, { onDelete: 'cascade' }),

  // Address fields
  street: text('street'),
  number: text('number'),
  complement: text('complement'),
  district: text('district'),
  zipcode: text('zipcode'),
  city: text('city'),
  state: text('state'),
  country: text('country'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ingresse User Addresses Relations
 * Many-to-one relationship with ingresse_users
 */
export const ingresseUserAddressesRelations = relations(ingresseUserAddresses, ({ one }) => ({
  ingresseUser: one(ingresseUsers, {
    fields: [ingresseUserAddresses.ingresseUserId],
    references: [ingresseUsers.id],
  }),
}));

// Type exports for TypeScript
export type IngresseUserAddress = typeof ingresseUserAddresses.$inferSelect;
export type NewIngresseUserAddress = typeof ingresseUserAddresses.$inferInsert;
