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

export const difficultyEnum = pgEnum('difficulty', ['beginner', 'intermediate', 'advanced']);

export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isTemplate: boolean('is_template').notNull().default(false), // Reusable template?
  isPublic: boolean('is_public').notNull().default(false), // Can anyone see/copy?
  isLocked: boolean('is_locked').notNull().default(false), // User locked (coach can't edit)
  difficulty: difficultyEnum('difficulty'),
  duration: integer('duration'), // Estimated duration in minutes
  tags: text('tags').array(), // ['push', 'strength', 'hypertrophy']
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
