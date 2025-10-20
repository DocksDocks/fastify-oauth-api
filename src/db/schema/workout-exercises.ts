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
  sets: integer('sets'), // Target sets (can be NULL for AMRAP)
  reps: integer('reps'), // Target reps (can be NULL for AMRAP)
  weight: decimal('weight', { precision: 10, scale: 2 }), // Target weight (can be NULL)
  restSeconds: integer('rest_seconds'), // Rest between sets
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
