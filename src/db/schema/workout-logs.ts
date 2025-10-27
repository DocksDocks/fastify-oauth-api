import { pgTable, serial, integer, text, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { workouts } from './workouts';

export const workoutLogStatusEnum = pgEnum('workout_log_status', [
  'in_progress',
  'completed',
  'abandoned',
]);

export const sessionTypeEnum = pgEnum('session_type', ['live', 'manual']);

export const workoutLogs = pgTable('workout_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workoutId: integer('workout_id').references(() => workouts.id, { onDelete: 'set null' }), // NULL for ad-hoc workouts
  name: text('name'), // For ad-hoc workouts without template
  status: workoutLogStatusEnum('status').notNull().default('in_progress'),
  sessionType: sessionTypeEnum('session_type').notNull().default('live'),
  startedAt: timestamp('started_at', { withTimezone: true }), // When session began (NULL for manual)
  completedAt: timestamp('completed_at', { withTimezone: true }), // When marked complete
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(), // User-editable for manual
  durationMinutes: integer('duration_minutes'), // Actual duration
  bodyweight: decimal('bodyweight', { precision: 5, scale: 2 }), // Track bodyweight for progress
  rating: integer('rating'), // 1-5 stars, user's subjective rating
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type NewWorkoutLog = typeof workoutLogs.$inferInsert;
