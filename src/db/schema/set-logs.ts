import { pgTable, serial, integer, text, timestamp, decimal, boolean } from 'drizzle-orm/pg-core';
import { workoutLogs } from './workout-logs';
import { exercises } from './exercises';

export const setLogs = pgTable('set_logs', {
  id: serial('id').primaryKey(),
  workoutLogId: integer('workout_log_id')
    .notNull()
    .references(() => workoutLogs.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'restrict' }),
  setNumber: integer('set_number').notNull(), // 1, 2, 3, ...
  reps: integer('reps').notNull(), // Actual reps performed
  weight: decimal('weight', { precision: 10, scale: 2 }), // Actual weight used (NULL for bodyweight)
  rpe: integer('rpe'), // Rate of Perceived Exertion (1-10 scale)
  restSeconds: integer('rest_seconds'), // Actual rest taken
  notes: text('notes'),
  isWarmup: boolean('is_warmup').notNull().default(false), // Exclude from progressive overload calculations
  isFailure: boolean('is_failure').notNull().default(false), // Did the set go to failure?
  isPR: boolean('is_pr').notNull().default(false), // Personal record flag
  volume: decimal('volume', { precision: 12, scale: 2 }), // Calculated: reps × weight (for progressive overload)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SetLog = typeof setLogs.$inferSelect;
export type NewSetLog = typeof setLogs.$inferInsert;
