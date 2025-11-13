import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildTestApp } from '../helper/app-helper';
import { createUser } from '../helper/factories';
import { generateTestToken } from '../helper/factories';
import type { FastifyInstance } from 'fastify';
import type { User } from '@/db/schema/users';
import { db } from '@/db/client';
import { providerAccounts } from '@/db/schema';
import '../helper/setup';

describe('Profile Routes', () => {
  let app: FastifyInstance;
  let user: User;
  let userToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    // Create test user
    user = await createUser({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      role: 'user',
    });

    // Generate token for user
    const tokens = await generateTestToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    userToken = tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/profile', () => {
    it('should get current user profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.id).toBe(user.id);
      expect(body.user.email).toBe(user.email);
      expect(body.user.name).toBe(user.name);
      expect(body.user.role).toBe(user.role);
      expect(body.user.createdAt).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle database error during profile fetch', async () => {
      // Mock database select to throw an error
      const mockSelect = vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to fetch profile');

      // Cleanup
      mockSelect.mockRestore();
    });
  });

  describe('PATCH /api/profile', () => {
    it('should update user name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.name).toBe('Updated Name');
      expect(body.user.id).toBe(user.id);
      expect(body.message).toContain('Profile updated successfully');
    });

    it('should update user avatar', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          avatar: 'https://example.com/avatar.jpg',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.avatar).toBe('https://example.com/avatar.jpg');
      expect(body.user.id).toBe(user.id);
    });

    it('should update both name and avatar', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'New Name',
          avatar: 'https://example.com/new-avatar.jpg',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.name).toBe('New Name');
      expect(body.user.avatar).toBe('https://example.com/new-avatar.jpg');
    });

    it('should fail without any fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('At least one field');
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        payload: {
          name: 'New Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should set name to null when empty string provided', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: '',
        },
      });

      // Fastify schema validation rejects empty strings (minLength: 1)
      expect(response.statusCode).toBe(400);
    });

    it('should reject name longer than 100 characters', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'a'.repeat(101),
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid avatar URL format', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          avatar: 'not-a-url',
        },
      });

      // Schema validation checks for 'uri' format
      expect(response.statusCode).toBe(400);
    });

    it('should return 404 when user not found during update', async () => {
      // Mock database update to return empty array (no user found)
      const mockUpdate = vi.spyOn(db, 'update').mockImplementationOnce(() => {
        return {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]), // Empty array = no user found
        } as unknown as ReturnType<typeof db.update>;
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'New Name',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('User not found');

      // Cleanup
      mockUpdate.mockRestore();
    });

    it('should handle database error during profile update', async () => {
      // Mock database update to throw an error
      const mockUpdate = vi.spyOn(db, 'update').mockImplementationOnce(() => {
        throw new Error('Database connection lost');
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'New Name',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to update profile');

      // Cleanup
      mockUpdate.mockRestore();
    });
  });

  describe('DELETE /api/profile', () => {
    it('should delete user account', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Account deleted successfully');
    });

    it('should fail to get profile after deletion', async () => {
      // Delete the account
      await app.inject({
        method: 'DELETE',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      // Try to get profile (token is still valid but user doesn't exist)
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('User not found');
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle database error during profile delete', async () => {
      // Mock database delete to throw an error
      const mockDelete = vi.spyOn(db, 'delete').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to delete account');

      // Cleanup
      mockDelete.mockRestore();
    });
  });

  describe('Admin/Superadmin Access Without API Key', () => {
    it('should allow admin to get profile with JWT only (no API key)', async () => {
      const adminUser = await createUser({
        email: `admin-${Date.now()}@example.com`,
        name: 'Admin User',
        role: 'admin',
      });

      const { accessToken } = await generateTestToken({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
          // No X-API-Key header
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.id).toBe(adminUser.id);
      expect(body.user.email).toBe(adminUser.email);
      expect(body.user.role).toBe('admin');
    });

    it('should allow superadmin to get profile with JWT only (no API key)', async () => {
      const superadminUser = await createUser({
        email: `superadmin-${Date.now()}@example.com`,
        name: 'Superadmin User',
        role: 'superadmin',
      });

      const { accessToken } = await generateTestToken({
        id: superadminUser.id,
        email: superadminUser.email,
        role: superadminUser.role,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
          // No X-API-Key header
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.id).toBe(superadminUser.id);
      expect(body.user.role).toBe('superadmin');
    });

    it('should allow admin to update profile with JWT only (no API key)', async () => {
      const adminUser = await createUser({
        email: `admin-${Date.now()}@example.com`,
        name: 'Admin User',
        role: 'admin',
      });

      const { accessToken } = await generateTestToken({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
          // No X-API-Key header
        },
        payload: {
          name: 'Updated Admin Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.name).toBe('Updated Admin Name');
    });

    it('should allow admin to update locale with JWT only (fixes language change issue)', async () => {
      const adminUser = await createUser({
        email: `admin-${Date.now()}@example.com`,
        name: 'Admin User',
        role: 'admin',
      });

      const { accessToken } = await generateTestToken({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
          // No X-API-Key header - this was causing 401 before the fix
        },
        payload: {
          locale: 'pt-BR',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Profile updated successfully');
    });

    it('should allow superadmin to delete profile with JWT only (no API key)', async () => {
      const superadminUser = await createUser({
        email: `superadmin-${Date.now()}@example.com`,
        name: 'Superadmin User',
        role: 'superadmin',
      });

      const { accessToken } = await generateTestToken({
        id: superadminUser.id,
        email: superadminUser.email,
        role: superadminUser.role,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
          // No X-API-Key header
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Account deleted successfully');
    });
  });

  describe('Profile Integration Flow', () => {
    it('should complete full profile lifecycle', async () => {
      // 1. Get initial profile
      const get1 = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(get1.statusCode).toBe(200);
      const body1 = JSON.parse(get1.body);
      expect(body1.user.name).toBe('Test User');

      // 2. Update name
      const update1 = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { name: 'Updated User' },
      });
      expect(update1.statusCode).toBe(200);

      // 3. Verify update persisted
      const get2 = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: { authorization: `Bearer ${userToken}` },
      });
      const body2 = JSON.parse(get2.body);
      expect(body2.user.name).toBe('Updated User');

      // 4. Update avatar
      const update2 = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: { authorization: `Bearer ${userToken}` },
        payload: { avatar: 'https://example.com/avatar.png' },
      });
      expect(update2.statusCode).toBe(200);

      // 5. Verify both fields
      const get3 = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: { authorization: `Bearer ${userToken}` },
      });
      const body3 = JSON.parse(get3.body);
      expect(body3.user.name).toBe('Updated User');
      expect(body3.user.avatar).toBe('https://example.com/avatar.png');

      // 6. Delete account
      const del = await app.inject({
        method: 'DELETE',
        url: '/api/profile',
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(del.statusCode).toBe(200);

      // 7. Verify account is gone
      const get4 = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(get4.statusCode).toBe(404);
    });
  });

  describe('GET /api/profile/providers', () => {
    it('should return all linked providers', async () => {
      // User already has a google provider from createUser()
      // Add an Apple provider account
      await db.insert(providerAccounts).values({
        userId: user.id,
        provider: 'apple',
        providerId: `apple_${Date.now()}`,
        email: user.email,
        name: user.name,
        avatar: null,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile/providers',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.providers).toHaveLength(2);
      expect(body.providers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ provider: 'google' }),
          expect.objectContaining({ provider: 'apple' }),
        ])
      );
    });

    it('should return existing provider when user has one linked', async () => {
      // User already has a google provider from createUser()
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile/providers',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.providers).toHaveLength(1);
      expect(body.providers[0].provider).toBe('google');
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile/providers',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle database error during providers fetch', async () => {
      // Mock database select to throw an error
      const mockSelect = vi.spyOn(db, 'select').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile/providers',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to fetch linked providers');

      // Cleanup
      mockSelect.mockRestore();
    });
  });

  describe('DELETE /api/profile/providers/:provider', () => {
    it('should unlink Google provider', async () => {
      // User already has a google provider from createUser()
      // Add an Apple provider account
      await db.insert(providerAccounts).values({
        userId: user.id,
        provider: 'apple',
        providerId: `apple_${Date.now()}`,
        email: user.email,
        name: user.name,
        avatar: null,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile/providers/google',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('google provider unlinked successfully');
      expect(body.remainingProviders).toHaveLength(1);
      expect(body.remainingProviders[0].provider).toBe('apple');
    });

    it('should unlink Apple provider', async () => {
      // User already has a google provider from createUser()
      // Add an Apple provider account
      await db.insert(providerAccounts).values({
        userId: user.id,
        provider: 'apple',
        providerId: `apple_${Date.now()}`,
        email: user.email,
        name: user.name,
        avatar: null,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile/providers/apple',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('apple provider unlinked successfully');
      expect(body.remainingProviders).toHaveLength(1);
      expect(body.remainingProviders[0].provider).toBe('google');
    });

    it('should reject invalid provider name', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile/providers/facebook',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      // Schema validation returns validation error
      expect(body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile/providers/google',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should prevent unlinking last provider', async () => {
      // User already has one google provider from createUser()
      // Attempt to unlink it (should fail because it's the last one)
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile/providers/google',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('last provider');
    });

    it('should handle database error during unlink', async () => {
      // User already has a google provider from createUser()
      // Add an Apple provider so we can unlink Google without it being the last one
      await db.insert(providerAccounts).values({
        userId: user.id,
        provider: 'apple',
        providerId: `apple_${Date.now()}`,
        email: user.email,
        name: user.name,
        avatar: null,
      });

      // Mock database delete to throw an error
      const mockDelete = vi.spyOn(db, 'delete').mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/profile/providers/google',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Database connection error');

      // Cleanup
      mockDelete.mockRestore();
    });
  });

  describe('PATCH /api/profile - Locked Fields', () => {
    it('should reject attempt to update email (locked field)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          email: 'newemail@example.com',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('locked');
    });

    it('should reject attempt to update role (locked field)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          role: 'admin',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('locked');
    });

    it('should reject attempt to update id (locked field)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          id: 999,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('locked');
    });

    it('should reject attempt to update createdAt (locked field)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          createdAt: new Date().toISOString(),
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('locked');
    });

    it('should allow updating non-locked fields (name, avatar)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Updated Name',
          avatar: 'https://example.com/avatar.jpg',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.name).toBe('Updated Name');
      expect(body.user.avatar).toBe('https://example.com/avatar.jpg');
    });
  });
});
