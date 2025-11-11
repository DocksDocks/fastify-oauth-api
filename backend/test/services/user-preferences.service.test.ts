import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getUserPreferences,
  createDefaultPreferences,
  updateUserPreferences,
  getOrCreateUserPreferences,
  deleteUserPreferences,
} from '@/services/user-preferences.service';
import { db } from '@/db/client';
import { users, userPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * User Preferences Service Test Suite
 * Tests CRUD operations for user preferences
 */

describe('User Preferences Service', () => {
  let testUserId: number;

  beforeEach(async () => {
    // Clear tables
    await db.delete(userPreferences);
    await db.delete(users);

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: `testuser-${Date.now()}@test.com`,
        name: 'Test User',
        role: 'user',
      })
      .returning();

    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up
    await db.delete(userPreferences);
    await db.delete(users);
  });

  describe('getUserPreferences', () => {
    it('should return user preferences when they exist', async () => {
      // Create preferences
      await db.insert(userPreferences).values({
        userId: testUserId,
        locale: 'en-US',
        theme: 'dark',
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        emailNotifications: false,
        pushNotifications: false,
        marketingEmails: true,
        compactMode: true,
        showAvatars: false,
      });

      const prefs = await getUserPreferences(testUserId);

      expect(prefs).toBeDefined();
      expect(prefs?.userId).toBe(testUserId);
      expect(prefs?.locale).toBe('en-US');
      expect(prefs?.theme).toBe('dark');
      expect(prefs?.timezone).toBe('America/New_York');
      expect(prefs?.currency).toBe('USD');
      expect(prefs?.emailNotifications).toBe(false);
      expect(prefs?.compactMode).toBe(true);
    });

    it('should return null when preferences do not exist', async () => {
      const prefs = await getUserPreferences(testUserId);

      expect(prefs).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const prefs = await getUserPreferences(99999);

      expect(prefs).toBeNull();
    });
  });

  describe('createDefaultPreferences', () => {
    it('should create default preferences with default locale', async () => {
      const prefs = await createDefaultPreferences(testUserId);

      expect(prefs).toBeDefined();
      expect(prefs.userId).toBe(testUserId);
      expect(prefs.locale).toBe('pt-BR');
      expect(prefs.theme).toBe('system');
      expect(prefs.timezone).toBe('America/Sao_Paulo');
      expect(prefs.currency).toBe('BRL');
      expect(prefs.dateFormat).toBe('MM/DD/YYYY');
      expect(prefs.timeFormat).toBe('24h');
      expect(prefs.emailNotifications).toBe(true);
      expect(prefs.pushNotifications).toBe(true);
      expect(prefs.marketingEmails).toBe(false);
      expect(prefs.compactMode).toBe(false);
      expect(prefs.showAvatars).toBe(true);

      // Verify in database
      const [dbPrefs] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, testUserId));
      expect(dbPrefs).toBeDefined();
      expect(dbPrefs.locale).toBe('pt-BR');
    });

    it('should create default preferences with custom locale', async () => {
      const prefs = await createDefaultPreferences(testUserId, 'en-US');

      expect(prefs.locale).toBe('en-US');
      expect(prefs.theme).toBe('system');
      expect(prefs.userId).toBe(testUserId);
    });

    it('should include createdAt and updatedAt timestamps', async () => {
      const prefs = await createDefaultPreferences(testUserId);

      expect(prefs.createdAt).toBeInstanceOf(Date);
      expect(prefs.updatedAt).toBeInstanceOf(Date);
    });

    it('should have unique ID', async () => {
      const prefs = await createDefaultPreferences(testUserId);

      expect(prefs.id).toBeDefined();
      expect(typeof prefs.id).toBe('number');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update existing preferences', async () => {
      // Create initial preferences
      await createDefaultPreferences(testUserId);

      // Update preferences
      const updated = await updateUserPreferences(testUserId, {
        locale: 'en-US',
        theme: 'dark',
        emailNotifications: false,
      });

      expect(updated.locale).toBe('en-US');
      expect(updated.theme).toBe('dark');
      expect(updated.emailNotifications).toBe(false);
      // Other fields should remain default
      expect(updated.timezone).toBe('America/Sao_Paulo');
      expect(updated.pushNotifications).toBe(true);
    });

    it('should create preferences if they do not exist', async () => {
      // Update without existing preferences
      const updated = await updateUserPreferences(testUserId, {
        locale: 'en-US',
        theme: 'light',
      });

      expect(updated).toBeDefined();
      expect(updated.userId).toBe(testUserId);
      expect(updated.locale).toBe('en-US');
      expect(updated.theme).toBe('light');
    });

    it('should return default preferences when updating with empty object', async () => {
      const updated = await updateUserPreferences(testUserId, {});

      expect(updated).toBeDefined();
      expect(updated.locale).toBe('pt-BR'); // Default
      expect(updated.theme).toBe('system'); // Default
    });

    it('should update multiple fields at once', async () => {
      await createDefaultPreferences(testUserId);

      const updated = await updateUserPreferences(testUserId, {
        locale: 'fr-FR',
        theme: 'dark',
        timezone: 'Europe/Paris',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        compactMode: true,
      });

      expect(updated.locale).toBe('fr-FR');
      expect(updated.theme).toBe('dark');
      expect(updated.timezone).toBe('Europe/Paris');
      expect(updated.currency).toBe('EUR');
      expect(updated.dateFormat).toBe('DD/MM/YYYY');
      expect(updated.compactMode).toBe(true);
    });

    it('should update notification preferences', async () => {
      await createDefaultPreferences(testUserId);

      const updated = await updateUserPreferences(testUserId, {
        emailNotifications: false,
        pushNotifications: false,
        marketingEmails: true,
      });

      expect(updated.emailNotifications).toBe(false);
      expect(updated.pushNotifications).toBe(false);
      expect(updated.marketingEmails).toBe(true);
    });

    it('should update UI preferences', async () => {
      await createDefaultPreferences(testUserId);

      const updated = await updateUserPreferences(testUserId, {
        compactMode: true,
        showAvatars: false,
      });

      expect(updated.compactMode).toBe(true);
      expect(updated.showAvatars).toBe(false);
    });

    it('should update updatedAt timestamp', async () => {
      await createDefaultPreferences(testUserId);

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await updateUserPreferences(testUserId, {
        locale: 'en-US',
      });

      // Fetch original to compare
      const [original] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, testUserId));

      expect(updated.updatedAt).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.createdAt.getTime());
    });
  });

  describe('getOrCreateUserPreferences', () => {
    it('should return existing preferences', async () => {
      // Create preferences first
      const created = await createDefaultPreferences(testUserId, 'en-US');

      // Get or create should return existing
      const prefs = await getOrCreateUserPreferences(testUserId);

      expect(prefs.id).toBe(created.id);
      expect(prefs.locale).toBe('en-US');
    });

    it('should create preferences if they do not exist', async () => {
      const prefs = await getOrCreateUserPreferences(testUserId);

      expect(prefs).toBeDefined();
      expect(prefs.userId).toBe(testUserId);
      expect(prefs.locale).toBe('pt-BR'); // Default

      // Verify in database
      const [dbPrefs] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, testUserId));
      expect(dbPrefs).toBeDefined();
    });

    it('should create preferences with custom locale', async () => {
      const prefs = await getOrCreateUserPreferences(testUserId, 'fr-FR');

      expect(prefs.locale).toBe('fr-FR');
    });

    it('should not create duplicate preferences', async () => {
      // First call creates
      await getOrCreateUserPreferences(testUserId);

      // Second call returns existing
      await getOrCreateUserPreferences(testUserId);

      // Verify only one record exists
      const allPrefs = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, testUserId));

      expect(allPrefs).toHaveLength(1);
    });
  });

  describe('deleteUserPreferences', () => {
    it('should delete user preferences successfully', async () => {
      // Create preferences
      await createDefaultPreferences(testUserId);

      // Verify they exist
      let prefs = await getUserPreferences(testUserId);
      expect(prefs).not.toBeNull();

      // Delete preferences
      await deleteUserPreferences(testUserId);

      // Verify deletion
      prefs = await getUserPreferences(testUserId);
      expect(prefs).toBeNull();
    });

    it('should handle deleting non-existent preferences gracefully', async () => {
      // Delete preferences that don't exist - should not throw
      await expect(deleteUserPreferences(testUserId)).resolves.not.toThrow();
    });

    it('should delete only specified user preferences', async () => {
      // Create another user
      const [anotherUser] = await db
        .insert(users)
        .values({
          email: `another-${Date.now()}@test.com`,
          name: 'Another User',
          role: 'user',
        })
        .returning();

      // Create preferences for both users
      await createDefaultPreferences(testUserId);
      await createDefaultPreferences(anotherUser.id);

      // Delete first user's preferences
      await deleteUserPreferences(testUserId);

      // Verify only first user's preferences were deleted
      const firstUserPrefs = await getUserPreferences(testUserId);
      const secondUserPrefs = await getUserPreferences(anotherUser.id);

      expect(firstUserPrefs).toBeNull();
      expect(secondUserPrefs).not.toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full preferences lifecycle', async () => {
      // 1. Initially, no preferences exist
      let prefs = await getUserPreferences(testUserId);
      expect(prefs).toBeNull();

      // 2. Get or create - creates default
      prefs = await getOrCreateUserPreferences(testUserId, 'en-US');
      expect(prefs.locale).toBe('en-US');
      expect(prefs.theme).toBe('system');

      // 3. Update preferences
      prefs = await updateUserPreferences(testUserId, {
        theme: 'dark',
        emailNotifications: false,
      });
      expect(prefs.theme).toBe('dark');
      expect(prefs.emailNotifications).toBe(false);
      expect(prefs.locale).toBe('en-US'); // Should retain previous value

      // 4. Get preferences
      prefs = await getUserPreferences(testUserId);
      expect(prefs?.theme).toBe('dark');
      expect(prefs?.emailNotifications).toBe(false);

      // 5. Update again
      prefs = await updateUserPreferences(testUserId, {
        compactMode: true,
        showAvatars: false,
      });
      expect(prefs.compactMode).toBe(true);
      expect(prefs.showAvatars).toBe(false);
      expect(prefs.theme).toBe('dark'); // Should retain

      // 6. Delete preferences
      await deleteUserPreferences(testUserId);
      prefs = await getUserPreferences(testUserId);
      expect(prefs).toBeNull();
    });

    it('should handle create and immediate update', async () => {
      // Create with default locale
      await createDefaultPreferences(testUserId);

      // Immediately update
      const updated = await updateUserPreferences(testUserId, {
        locale: 'ja-JP',
        currency: 'JPY',
      });

      expect(updated.locale).toBe('ja-JP');
      expect(updated.currency).toBe('JPY');
    });
  });
});
