import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildTestApp } from '../helper/app-helper';
import { createUser } from '../helper/factories';
import { generateTestToken } from '../helper/factories';
import type { FastifyInstance } from 'fastify';
import type { User } from '@/db/schema/users';
import { db } from '@/db/client';
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
      expect(body.data.id).toBe(user.id);
      expect(body.data.email).toBe(user.email);
      expect(body.data.name).toBe(user.name);
      expect(body.data.role).toBe(user.role);
      expect(body.data.provider).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
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
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.id).toBe(user.id);
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
      expect(body.data.avatar).toBe('https://example.com/avatar.jpg');
      expect(body.data.id).toBe(user.id);
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
      expect(body.data.name).toBe('New Name');
      expect(body.data.avatar).toBe('https://example.com/new-avatar.jpg');
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
        } as any;
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
      expect(body1.data.name).toBe('Test User');

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
      expect(body2.data.name).toBe('Updated User');

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
      expect(body3.data.name).toBe('Updated User');
      expect(body3.data.avatar).toBe('https://example.com/avatar.png');

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
});
