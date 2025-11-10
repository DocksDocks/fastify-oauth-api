/**
 * User Preferences Service
 *
 * Handles CRUD operations for user preferences
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { userPreferences, type UserPreferences, type NewUserPreferences } from '@/db/schema';

/**
 * Get user preferences by user ID
 * Returns null if preferences don't exist yet
 */
export async function getUserPreferences(userId: number): Promise<UserPreferences | null> {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return prefs || null;
}

/**
 * Create default preferences for a new user
 * Called automatically during user registration
 */
export async function createDefaultPreferences(
  userId: number,
  locale?: string,
  tx?: typeof db // Optional transaction object
): Promise<UserPreferences> {
  const dbOrTx = tx || db; // Use transaction if provided, otherwise use global db

  const [prefs] = await dbOrTx
    .insert(userPreferences)
    .values({
      userId,
      locale: locale || 'pt-BR',
      theme: 'system',
      timezone: 'America/Sao_Paulo',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      compactMode: false,
      showAvatars: true,
    })
    .returning();

  if (!prefs) {
    throw new Error('Failed to create user preferences');
  }

  return prefs;
}

/**
 * Update user preferences
 * Creates preferences if they don't exist
 */
export async function updateUserPreferences(
  userId: number,
  updates: Partial<Omit<NewUserPreferences, 'userId' | 'id' | 'createdAt' | 'updatedAt'>>
): Promise<UserPreferences> {
  // Check if preferences exist
  const existing = await getUserPreferences(userId);

  if (!existing) {
    // Create default preferences first, then update with provided values
    const defaultPrefs = await createDefaultPreferences(userId);
    if (Object.keys(updates).length === 0) {
      return defaultPrefs;
    }
  }

  // Update preferences
  const [updated] = await db
    .update(userPreferences)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(userPreferences.userId, userId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update user preferences');
  }

  return updated;
}

/**
 * Get or create user preferences
 * Returns existing preferences or creates default ones
 */
export async function getOrCreateUserPreferences(userId: number, locale?: string): Promise<UserPreferences> {
  const existing = await getUserPreferences(userId);

  if (existing) {
    return existing;
  }

  return createDefaultPreferences(userId, locale);
}

/**
 * Delete user preferences
 * Note: Preferences are automatically deleted when user is deleted (CASCADE)
 */
export async function deleteUserPreferences(userId: number): Promise<void> {
  await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
}
