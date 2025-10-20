import { pgTable, serial, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // Hashed refresh token
  familyId: text('family_id').notNull(), // For token rotation/reuse detection
  isRevoked: boolean('is_revoked').notNull().default(false), // Manual revocation
  isUsed: boolean('is_used').notNull().default(false), // For one-time use
  replacedBy: integer('replaced_by').references(() => refreshTokens.id, { onDelete: 'set null' }), // Token rotation chain
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // 7 days default
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  usedAt: timestamp('used_at', { withTimezone: true }), // When token was used to refresh
  revokedAt: timestamp('revoked_at', { withTimezone: true }), // When manually revoked
  ipAddress: text('ip_address'), // Optional: track where token was created
  userAgent: text('user_agent'), // Optional: track device/browser
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
