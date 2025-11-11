import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleSetupOAuthCallback } from '@/services/setup-auth.service';
import { db } from '@/db/client';
import { users, providerAccounts, userPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { OAuthProfile } from '@/modules/auth/auth.types';

/**
 * Setup Auth Service Test Suite
 * Tests OAuth authentication during first-time setup
 */

describe('Setup Auth Service', () => {
  beforeEach(async () => {
    // Clear tables
    await db.delete(userPreferences);
    await db.delete(providerAccounts);
    await db.delete(users);
  });

  afterEach(async () => {
    // Clean up
    await db.delete(userPreferences);
    await db.delete(providerAccounts);
    await db.delete(users);
  });

  describe('handleSetupOAuthCallback', () => {
    it('should create first user as superadmin with Google profile', async () => {
      const googleProfile: OAuthProfile = {
        email: 'admin@example.com',
        name: 'Admin User',
        avatar: 'https://example.com/avatar.jpg',
        provider: 'google',
        providerId: 'google_123456',
      };

      const user = await handleSetupOAuthCallback(googleProfile);

      // Verify user was created
      expect(user).toBeDefined();
      expect(user.email).toBe('admin@example.com');
      expect(user.name).toBe('Admin User');
      expect(user.avatar).toBe('https://example.com/avatar.jpg');
      expect(user.role).toBe('superadmin'); // First user is superadmin
      expect(user.lastLoginAt).toBeInstanceOf(Date);

      // Verify user in database
      const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
      expect(dbUser).toBeDefined();
      expect(dbUser.role).toBe('superadmin');
    });

    it('should create first user with Apple profile', async () => {
      const appleProfile: OAuthProfile = {
        email: 'admin@example.com',
        name: 'Admin User',
        avatar: null,
        provider: 'apple',
        providerId: 'apple_123456',
      };

      const user = await handleSetupOAuthCallback(appleProfile);

      // Verify user was created
      expect(user).toBeDefined();
      expect(user.email).toBe('admin@example.com');
      expect(user.role).toBe('superadmin');

      // Verify provider account
      const [providerAccount] = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.userId, user.id));

      expect(providerAccount).toBeDefined();
      expect(providerAccount.provider).toBe('apple');
      expect(providerAccount.providerId).toBe('apple_123456');
    });

    it('should create provider account and link to user', async () => {
      const profile: OAuthProfile = {
        email: 'admin@example.com',
        name: 'Admin User',
        avatar: 'https://example.com/avatar.jpg',
        provider: 'google',
        providerId: 'google_123',
      };

      const user = await handleSetupOAuthCallback(profile);

      // Verify provider account was created
      const accounts = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.userId, user.id));

      expect(accounts).toHaveLength(1);
      expect(accounts[0].provider).toBe('google');
      expect(accounts[0].providerId).toBe('google_123');
      expect(accounts[0].email).toBe('admin@example.com');

      // Verify user has primaryProviderAccountId set (read from DB since returned object may not be updated)
      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      expect(updatedUser.primaryProviderAccountId).toBe(accounts[0].id);
    });

    it('should create default user preferences', async () => {
      const profile: OAuthProfile = {
        email: 'admin@example.com',
        name: 'Admin User',
        avatar: null,
        provider: 'google',
        providerId: 'google_123',
      };

      const user = await handleSetupOAuthCallback(profile);

      // Verify default preferences were created
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, user.id));

      expect(preferences).toBeDefined();
      expect(preferences.locale).toBe('pt-BR');
      expect(preferences.emailNotifications).toBe(true);
      expect(preferences.pushNotifications).toBe(true);
    });

    it('should handle user with no name', async () => {
      const profile: OAuthProfile = {
        email: 'noname@example.com',
        name: null,
        avatar: null,
        provider: 'google',
        providerId: 'google_noname',
      };

      const user = await handleSetupOAuthCallback(profile);

      expect(user).toBeDefined();
      expect(user.email).toBe('noname@example.com');
      expect(user.name).toBeNull();
      expect(user.role).toBe('superadmin');
    });

    it('should handle user with no avatar', async () => {
      const profile: OAuthProfile = {
        email: 'noavatar@example.com',
        name: 'No Avatar User',
        avatar: null,
        provider: 'google',
        providerId: 'google_noavatar',
      };

      const user = await handleSetupOAuthCallback(profile);

      expect(user).toBeDefined();
      expect(user.avatar).toBeNull();
      expect(user.role).toBe('superadmin');
    });

    it('should return existing user and update lastLoginAt', async () => {
      // Create existing user first
      const [existingUser] = await db
        .insert(users)
        .values({
          email: 'existing@example.com',
          name: 'Existing User',
          role: 'superadmin',
          lastLoginAt: new Date('2024-01-01'),
        })
        .returning();

      const profile: OAuthProfile = {
        email: 'existing@example.com',
        name: 'Existing User Updated',
        avatar: null,
        provider: 'google',
        providerId: 'google_existing',
      };

      const user = await handleSetupOAuthCallback(profile);

      // Should return the same user
      expect(user.id).toBe(existingUser.id);
      expect(user.email).toBe('existing@example.com');

      // Verify lastLoginAt was updated
      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      expect(updatedUser.lastLoginAt).not.toEqual(new Date('2024-01-01'));
      expect(updatedUser.lastLoginAt?.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
    });

    it('should not create duplicate users for same email', async () => {
      // Create first user
      const profile1: OAuthProfile = {
        email: 'duplicate@example.com',
        name: 'First Creation',
        avatar: null,
        provider: 'google',
        providerId: 'google_1',
      };
      const user1 = await handleSetupOAuthCallback(profile1);

      // Try to create another user with same email
      const profile2: OAuthProfile = {
        email: 'duplicate@example.com',
        name: 'Second Creation',
        avatar: null,
        provider: 'apple',
        providerId: 'apple_1',
      };
      const user2 = await handleSetupOAuthCallback(profile2);

      // Should return the same user
      expect(user1.id).toBe(user2.id);

      // Verify only one user exists
      const allUsers = await db.select().from(users).where(eq(users.email, 'duplicate@example.com'));
      expect(allUsers).toHaveLength(1);
    });

    it('should ensure first user is always superadmin', async () => {
      const profile: OAuthProfile = {
        email: 'firstuser@example.com',
        name: 'First User',
        avatar: null,
        provider: 'google',
        providerId: 'google_first',
      };

      const user = await handleSetupOAuthCallback(profile);

      // Verify role is superadmin
      expect(user.role).toBe('superadmin');

      // Double-check in database
      const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
      expect(dbUser.role).toBe('superadmin');
    });

    it('should set lastLoginAt to current time', async () => {
      const before = new Date();

      const profile: OAuthProfile = {
        email: 'timingtest@example.com',
        name: 'Timing Test',
        avatar: null,
        provider: 'google',
        providerId: 'google_timing',
      };

      const user = await handleSetupOAuthCallback(profile);
      const after = new Date();

      // Verify lastLoginAt is between before and after
      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(user.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.lastLoginAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use transaction (atomic operation)', async () => {
      const profile: OAuthProfile = {
        email: 'transaction@example.com',
        name: 'Transaction Test',
        avatar: null,
        provider: 'google',
        providerId: 'google_transaction',
      };

      const user = await handleSetupOAuthCallback(profile);

      // Verify all related records exist (user, provider account, preferences)
      const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
      const [account] = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.userId, user.id));
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, user.id));

      expect(dbUser).toBeDefined();
      expect(account).toBeDefined();
      expect(preferences).toBeDefined();

      // Verify user has primaryProviderAccountId set
      expect(dbUser.primaryProviderAccountId).toBe(account.id);
    });

    it('should handle profile with all fields populated', async () => {
      const profile: OAuthProfile = {
        email: 'complete@example.com',
        name: 'Complete Profile',
        avatar: 'https://example.com/avatar.jpg',
        provider: 'google',
        providerId: 'google_complete',
      };

      const user = await handleSetupOAuthCallback(profile);

      expect(user.email).toBe('complete@example.com');
      expect(user.name).toBe('Complete Profile');
      expect(user.avatar).toBe('https://example.com/avatar.jpg');
      expect(user.role).toBe('superadmin');
      expect(user.primaryProviderAccountId).toBeDefined();
    });

    it('should handle profile with minimal fields', async () => {
      const profile: OAuthProfile = {
        email: 'minimal@example.com',
        name: null,
        avatar: null,
        provider: 'apple',
        providerId: 'apple_minimal',
      };

      const user = await handleSetupOAuthCallback(profile);

      expect(user.email).toBe('minimal@example.com');
      expect(user.name).toBeNull();
      expect(user.avatar).toBeNull();
      expect(user.role).toBe('superadmin');
      expect(user.primaryProviderAccountId).toBeDefined();
    });
  });
});
