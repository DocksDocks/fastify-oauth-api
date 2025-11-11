/**
 * User Preferences Schema
 *
 * One-to-one relationship with users table
 * Stores user-specific preferences and settings
 */

import { pgTable, serial, integer, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Theme enum for UI appearance
 */
export const themeEnum = pgEnum('theme', ['light', 'dark', 'system']);

/**
 * Timezone enum (common timezones)
 */
export const timezoneEnum = pgEnum('timezone', [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
]);

/**
 * Currency enum (common currencies)
 */
export const currencyEnum = pgEnum('currency', [
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'BRL', // Brazilian Real
  'JPY', // Japanese Yen
  'CNY', // Chinese Yuan
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CHF', // Swiss Franc
  'INR', // Indian Rupee
]);

/**
 * Date format enum
 */
export const dateFormatEnum = pgEnum('date_format', [
  'MM/DD/YYYY', // US format
  'DD/MM/YYYY', // European/Brazilian format
  'YYYY-MM-DD', // ISO format
  'DD.MM.YYYY', // German format
  'DD-MM-YYYY', // Alternative European
]);

/**
 * Time format enum
 */
export const timeFormatEnum = pgEnum('time_format', [
  '12h', // 12-hour format (AM/PM)
  '24h', // 24-hour format
]);

/**
 * User Preferences Table
 */
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),

  // Foreign key to users table (one-to-one)
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Appearance
  theme: themeEnum('theme').notNull().default('system'),

  // Localization
  locale: text('locale').notNull().default('pt-BR'), // Using locale enum from users table
  timezone: timezoneEnum('timezone').notNull().default('America/Sao_Paulo'),
  currency: currencyEnum('currency').notNull().default('USD'),
  dateFormat: dateFormatEnum('date_format').notNull().default('MM/DD/YYYY'),
  timeFormat: timeFormatEnum('time_format').notNull().default('24h'),

  // Notifications
  emailNotifications: boolean('email_notifications').notNull().default(true),
  pushNotifications: boolean('push_notifications').notNull().default(true),
  marketingEmails: boolean('marketing_emails').notNull().default(false),

  // Additional settings (can be expanded)
  compactMode: boolean('compact_mode').notNull().default(false), // Dense UI layout
  showAvatars: boolean('show_avatars').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

/**
 * TypeScript types
 */
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
