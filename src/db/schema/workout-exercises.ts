import { pgTable, serial, integer, text, timestamp, decimal } from 'drizzle-orm/pg-core';
import { workouts } from './workouts';
import { exercises } from './exercises';

export const workoutExercises = pgTable('workout_exercises', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'restrict' }),
  orderIndex: integer('order_index').notNull(), // Order in workout (0, 1, 2, ...)
  reps: integer('reps'), // Target reps (can be NULL for AMRAP)
  weight: decimal('weight', { precision: 10, scale: 2 }), // Target weight (can be NULL)
  notes: text('notes'),
  // Set type configuration (0-10 sets per type)
  warmupSetsCount: integer('warmup_sets_count').notNull().default(0),
  warmupRestSeconds: integer('warmup_rest_seconds'), // 0-3600, NULL if warmupSetsCount is 0
  prepSetsCount: integer('prep_sets_count').notNull().default(0),
  prepRestSeconds: integer('prep_rest_seconds'), // 0-3600, NULL if prepSetsCount is 0
  workingSetsCount: integer('working_sets_count').notNull().default(0),
  workingRestSeconds: integer('working_rest_seconds'), // 0-3600, NULL if workingSetsCount is 0
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
