import { pgTable, serial, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const coachInvitationStatusEnum = pgEnum('coach_invitation_status', [
  'pending', // Coach sent invitation, user hasn't responded
  'accepted', // User accepted, coach is active
  'rejected', // User rejected the invitation
  'removed', // User removed the coach after accepting
]);

export const userCoaches = pgTable('user_coaches', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // The client/user
  coachId: integer('coach_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // The coach
  status: coachInvitationStatusEnum('status').notNull().default('pending'),
  invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(), // When coach sent invitation
  respondedAt: timestamp('responded_at', { withTimezone: true }), // When user accepted/rejected
  removedAt: timestamp('removed_at', { withTimezone: true }), // When user removed coach
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserCoach = typeof userCoaches.$inferSelect;
export type NewUserCoach = typeof userCoaches.$inferInsert;
