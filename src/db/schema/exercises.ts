import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  pgEnum,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const exerciseCategoryEnum = pgEnum('exercise_category', [
  'strength',
  'cardio',
  'flexibility',
  'other',
]);

export const muscleGroupEnum = pgEnum('muscle_group', [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
]);

export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(), // Unique identifier (e.g., BARBELL_BENCH_PRESS)
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: exerciseCategoryEnum('category').notNull().default('strength'),
  muscleGroup: muscleGroupEnum('muscle_group').notNull(),
  equipment: varchar('equipment', { length: 100 }), // e.g., 'barbell', 'dumbbell', 'machine', 'bodyweight'
  videoUrl: text('video_url'),
  instructions: text('instructions'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }), // NULL for system exercises
  isPublic: boolean('is_public').notNull().default(true), // Public exercises vs user custom
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
