import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getProviderAccount,
  getUserProviderAccounts,
  createProviderAccount,
  deleteProviderAccount,
  setPrimaryProvider,
  hasProviderLinked,
  getUserIdByProvider,
} from '@/modules/auth/provider-accounts.service';
import { db } from '@/db/client';
import { users, providerAccounts, userPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Provider Accounts Service Test Suite
 * Tests multi-provider OAuth account management
 */

describe('Provider Accounts Service', () => {
  let testUserId: number;
  let testUserEmail: string;

  beforeEach(async () => {
    // Clear tables
    await db.delete(userPreferences);
    await db.delete(providerAccounts);
    await db.delete(users);

    // Create test user
    testUserEmail = `testuser-${Date.now()}@test.com`;
    const [user] = await db
      .insert(users)
      .values({
        email: testUserEmail,
        name: 'Test User',
        role: 'user',
      })
      .returning();

    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up
    await db.delete(userPreferences);
    await db.delete(providerAccounts);
    await db.delete(users);
  });

  describe('getProviderAccount', () => {
    it('should find existing provider account', async () => {
      // Create provider account
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      const account = await getProviderAccount('google', 'google_123');

      expect(account).toBeDefined();
      expect(account?.provider).toBe('google');
      expect(account?.providerId).toBe('google_123');
      expect(account?.userId).toBe(testUserId);
    });

    it('should return null for non-existent provider account', async () => {
      const account = await getProviderAccount('google', 'nonexistent_id');

      expect(account).toBeNull();
    });

    it('should distinguish between different providers', async () => {
      // Create Google account
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      // Try to find with Apple provider
      const account = await getProviderAccount('apple', 'google_123');

      expect(account).toBeNull();
    });
  });

  describe('getUserProviderAccounts', () => {
    it('should return all provider accounts for user', async () => {
      // Create Google account
      const [googleAccount] = await db
        .insert(providerAccounts)
        .values({
          userId: testUserId,
          provider: 'google',
          providerId: 'google_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        })
        .returning();

      // Create Apple account
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'apple',
        providerId: 'apple_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      // Set primary provider
      await db.update(users).set({ primaryProviderAccountId: googleAccount.id }).where(eq(users.id, testUserId));

      const accounts = await getUserProviderAccounts(testUserId);

      expect(accounts).toHaveLength(2);
      expect(accounts.map((a) => a.provider).sort()).toEqual(['apple', 'google']);

      // Check isPrimary flag
      const googleAccountInfo = accounts.find((a) => a.provider === 'google');
      const appleAccountInfo = accounts.find((a) => a.provider === 'apple');
      expect(googleAccountInfo?.isPrimary).toBe(true);
      expect(appleAccountInfo?.isPrimary).toBe(false);
    });

    it('should return empty array for user with no provider accounts', async () => {
      const accounts = await getUserProviderAccounts(testUserId);

      expect(accounts).toEqual([]);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getUserProviderAccounts(99999)).rejects.toThrow('User not found');
    });

    it('should include all provider account details', async () => {
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
      });

      const accounts = await getUserProviderAccounts(testUserId);

      expect(accounts[0]).toMatchObject({
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        isPrimary: false,
      });
      expect(accounts[0].id).toBeDefined();
      expect(accounts[0].linkedAt).toBeDefined();
    });
  });

  describe('createProviderAccount', () => {
    it('should create new provider account', async () => {
      const account = await createProviderAccount(
        testUserId,
        'google',
        'google_123',
        testUserEmail,
        'Test User',
        'https://example.com/avatar.jpg'
      );

      expect(account).toBeDefined();
      expect(account.userId).toBe(testUserId);
      expect(account.provider).toBe('google');
      expect(account.providerId).toBe('google_123');
      expect(account.email).toBe(testUserEmail);
      expect(account.name).toBe('Test User');
      expect(account.avatar).toBe('https://example.com/avatar.jpg');

      // Verify in database
      const [dbAccount] = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.id, account.id));
      expect(dbAccount).toBeDefined();
    });

    it('should create provider account with null name and avatar', async () => {
      const account = await createProviderAccount(
        testUserId,
        'apple',
        'apple_123',
        testUserEmail,
        null,
        null
      );

      expect(account.name).toBeNull();
      expect(account.avatar).toBeNull();
    });

    it('should reject duplicate provider for same user', async () => {
      // Create first Google account
      await createProviderAccount(testUserId, 'google', 'google_123', testUserEmail, 'Test User', null);

      // Try to create another Google account
      await expect(
        createProviderAccount(testUserId, 'google', 'google_456', testUserEmail, 'Test User', null)
      ).rejects.toThrow('User already has google provider linked');
    });

    it('should reject provider account already linked to another user', async () => {
      // Create another user
      const [anotherUser] = await db
        .insert(users)
        .values({
          email: `another-${Date.now()}@test.com`,
          name: 'Another User',
          role: 'user',
        })
        .returning();

      // Link Google to first user
      await createProviderAccount(testUserId, 'google', 'google_123', testUserEmail, 'Test User', null);

      // Try to link same Google account to another user
      await expect(
        createProviderAccount(anotherUser.id, 'google', 'google_123', anotherUser.email, 'Another User', null)
      ).rejects.toThrow('This google account is already linked to another user');
    });

    it('should allow different users to have different provider accounts', async () => {
      // Create another user
      const [anotherUser] = await db
        .insert(users)
        .values({
          email: `another-${Date.now()}@test.com`,
          name: 'Another User',
          role: 'user',
        })
        .returning();

      // Link Google to first user
      const account1 = await createProviderAccount(testUserId, 'google', 'google_123', testUserEmail, 'Test User', null);

      // Link Google to second user (different providerId)
      const account2 = await createProviderAccount(
        anotherUser.id,
        'google',
        'google_456',
        anotherUser.email,
        'Another User',
        null
      );

      expect(account1.providerId).toBe('google_123');
      expect(account2.providerId).toBe('google_456');
    });
  });

  describe('deleteProviderAccount', () => {
    it('should delete provider account successfully', async () => {
      // Create two provider accounts
      await db.insert(providerAccounts).values([
        {
          userId: testUserId,
          provider: 'google',
          providerId: 'google_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: null,
        },
        {
          userId: testUserId,
          provider: 'apple',
          providerId: 'apple_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: null,
        },
      ]);

      // Delete Google account
      await deleteProviderAccount(testUserId, 'google');

      // Verify deletion
      const remaining = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.userId, testUserId));

      expect(remaining).toHaveLength(1);
      expect(remaining[0].provider).toBe('apple');
    });

    it('should prevent deleting the last provider', async () => {
      // Create only one provider account
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      // Try to delete it
      await expect(deleteProviderAccount(testUserId, 'google')).rejects.toThrow(
        'Cannot unlink the last provider'
      );

      // Verify account still exists
      const accounts = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.userId, testUserId));
      expect(accounts).toHaveLength(1);
    });

    it('should switch primary provider when deleting primary', async () => {
      // Create two provider accounts
      const [googleAccount] = await db
        .insert(providerAccounts)
        .values({
          userId: testUserId,
          provider: 'google',
          providerId: 'google_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: null,
        })
        .returning();

      const [appleAccount] = await db
        .insert(providerAccounts)
        .values({
          userId: testUserId,
          provider: 'apple',
          providerId: 'apple_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: null,
        })
        .returning();

      // Set Google as primary
      await db.update(users).set({ primaryProviderAccountId: googleAccount.id }).where(eq(users.id, testUserId));

      // Delete primary provider (Google)
      await deleteProviderAccount(testUserId, 'google');

      // Verify primary switched to Apple
      const [updatedUser] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(updatedUser.primaryProviderAccountId).toBe(appleAccount.id);
    });

    it('should handle deleting non-primary provider', async () => {
      // Create two provider accounts
      const [googleAccount] = await db
        .insert(providerAccounts)
        .values({
          userId: testUserId,
          provider: 'google',
          providerId: 'google_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: null,
        })
        .returning();

      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'apple',
        providerId: 'apple_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      // Set Google as primary
      await db.update(users).set({ primaryProviderAccountId: googleAccount.id }).where(eq(users.id, testUserId));

      // Delete non-primary provider (Apple)
      await deleteProviderAccount(testUserId, 'apple');

      // Verify primary didn't change
      const [updatedUser] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(updatedUser.primaryProviderAccountId).toBe(googleAccount.id);

      // Verify only Google remains
      const remaining = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.userId, testUserId));
      expect(remaining).toHaveLength(1);
      expect(remaining[0].provider).toBe('google');
    });

    it('should throw error for non-existent user', async () => {
      // Function checks account count before user existence, so it will throw "Cannot unlink" error
      await expect(deleteProviderAccount(99999, 'google')).rejects.toThrow('Cannot unlink');
    });
  });

  describe('setPrimaryProvider', () => {
    it('should set primary provider successfully', async () => {
      // Create provider account
      const [account] = await db
        .insert(providerAccounts)
        .values({
          userId: testUserId,
          provider: 'google',
          providerId: 'google_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: null,
        })
        .returning();

      // Set as primary
      await setPrimaryProvider(testUserId, 'google');

      // Verify
      const [user] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(user.primaryProviderAccountId).toBe(account.id);
    });

    it('should update primary provider when changing', async () => {
      // Create two provider accounts
      const [googleAccount] = await db
        .insert(providerAccounts)
        .values({
          userId: testUserId,
          provider: 'google',
          providerId: 'google_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: null,
        })
        .returning();

      const [appleAccount] = await db
        .insert(providerAccounts)
        .values({
          userId: testUserId,
          provider: 'apple',
          providerId: 'apple_123',
          email: testUserEmail,
          name: 'Test User',
          avatar: null,
        })
        .returning();

      // Set Google as primary
      await setPrimaryProvider(testUserId, 'google');
      let [user] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(user.primaryProviderAccountId).toBe(googleAccount.id);

      // Change to Apple
      await setPrimaryProvider(testUserId, 'apple');
      [user] = await db.select().from(users).where(eq(users.id, testUserId));
      expect(user.primaryProviderAccountId).toBe(appleAccount.id);
    });

    it('should throw error for non-linked provider', async () => {
      await expect(setPrimaryProvider(testUserId, 'google')).rejects.toThrow(
        'User does not have google provider linked'
      );
    });
  });

  describe('hasProviderLinked', () => {
    it('should return true when provider is linked', async () => {
      // Create provider account
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      const hasGoogle = await hasProviderLinked(testUserId, 'google');

      expect(hasGoogle).toBe(true);
    });

    it('should return false when provider is not linked', async () => {
      const hasGoogle = await hasProviderLinked(testUserId, 'google');

      expect(hasGoogle).toBe(false);
    });

    it('should distinguish between different providers', async () => {
      // Link only Google
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      const hasGoogle = await hasProviderLinked(testUserId, 'google');
      const hasApple = await hasProviderLinked(testUserId, 'apple');

      expect(hasGoogle).toBe(true);
      expect(hasApple).toBe(false);
    });
  });

  describe('getUserIdByProvider', () => {
    it('should return user ID for existing provider account', async () => {
      // Create provider account
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      const userId = await getUserIdByProvider('google', 'google_123');

      expect(userId).toBe(testUserId);
    });

    it('should return null for non-existent provider account', async () => {
      const userId = await getUserIdByProvider('google', 'nonexistent_id');

      expect(userId).toBeNull();
    });

    it('should distinguish between different provider IDs', async () => {
      // Create provider account
      await db.insert(providerAccounts).values({
        userId: testUserId,
        provider: 'google',
        providerId: 'google_123',
        email: testUserEmail,
        name: 'Test User',
        avatar: null,
      });

      // Try different providerId
      const userId = await getUserIdByProvider('google', 'google_456');

      expect(userId).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should complete multi-provider lifecycle', async () => {
      // 1. Create first provider (Google)
      const googleAccount = await createProviderAccount(
        testUserId,
        'google',
        'google_123',
        testUserEmail,
        'Test User',
        'https://example.com/avatar.jpg'
      );
      expect(googleAccount).toBeDefined();

      // 2. Verify user has Google linked
      const hasGoogle1 = await hasProviderLinked(testUserId, 'google');
      expect(hasGoogle1).toBe(true);

      // 3. Set Google as primary
      await setPrimaryProvider(testUserId, 'google');

      // 4. Add second provider (Apple)
      const appleAccount = await createProviderAccount(
        testUserId,
        'apple',
        'apple_123',
        testUserEmail,
        'Test User',
        null
      );
      expect(appleAccount).toBeDefined();

      // 5. Get all provider accounts
      let accounts = await getUserProviderAccounts(testUserId);
      expect(accounts).toHaveLength(2);
      expect(accounts.find((a) => a.provider === 'google')?.isPrimary).toBe(true);

      // 6. Switch primary to Apple
      await setPrimaryProvider(testUserId, 'apple');
      accounts = await getUserProviderAccounts(testUserId);
      expect(accounts.find((a) => a.provider === 'apple')?.isPrimary).toBe(true);

      // 7. Delete non-primary provider (Google)
      await deleteProviderAccount(testUserId, 'google');
      accounts = await getUserProviderAccounts(testUserId);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].provider).toBe('apple');

      // 8. Verify cannot delete last provider
      await expect(deleteProviderAccount(testUserId, 'apple')).rejects.toThrow(
        'Cannot unlink the last provider'
      );
    });
  });
});
