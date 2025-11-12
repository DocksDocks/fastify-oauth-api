import { pgTable, serial, varchar, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const collectionDefinitions = pgTable('collection_definitions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(), // Internal name (snake_case)
  apiName: varchar('api_name', { length: 255 }).notNull().unique(), // API endpoint name
  displayName: varchar('display_name', { length: 255 }).notNull(), // Human-readable name
  description: text('description'),
  icon: varchar('icon', { length: 50 }), // Lucide icon name
  fields: jsonb('fields').notNull(), // Array of field definitions
  indexes: jsonb('indexes'), // Array of index definitions
  relationships: jsonb('relationships'), // Array of relationship configs
  isSystem: boolean('is_system').notNull().default(false), // System collections can't be deleted
  createdBy: integer('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('idx_collection_definitions_name').on(table.name),
  apiNameIdx: index('idx_collection_definitions_api_name').on(table.apiName),
  createdByIdx: index('idx_collection_definitions_created_by').on(table.createdBy),
}));

// Relations
export const collectionDefinitionsRelations = relations(collectionDefinitions, ({ one }) => ({
  creator: one(users, {
    fields: [collectionDefinitions.createdBy],
    references: [users.id],
  }),
}));

export type CollectionDefinition = typeof collectionDefinitions.$inferSelect;
export type NewCollectionDefinition = typeof collectionDefinitions.$inferInsert;
