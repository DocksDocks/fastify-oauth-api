import { pgTable, serial, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { workouts } from './workouts';
import { users } from './users';

export const sharePermissionEnum = pgEnum('share_permission', ['view', 'copy']);

export const workoutShares = pgTable('workout_shares', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  sharedById: integer('shared_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // Who shared it
  sharedWithId: integer('shared_with_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // Who received it
  permission: sharePermissionEnum('permission').notNull().default('view'), // view or copy
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type WorkoutShare = typeof workoutShares.$inferSelect;
export type NewWorkoutShare = typeof workoutShares.$inferInsert;
