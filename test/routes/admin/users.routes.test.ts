import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildTestApp } from '../../helper/app-helper';
import { createUser } from '../../helper/factories';
import { generateTestToken } from '../../helper/factories';
import type { FastifyInstance } from 'fastify';
import type { User } from '@/db/schema/users';
import '../../helper/setup';

describe('Admin Users Routes', () => {
  let app: FastifyInstance;
  let regularUser: User;
  let adminUser: User;
  let superadminUser: User;
  let regularToken: string;
  let adminToken: string;
  let superadminToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(async () => {
    // Create users with different roles
    regularUser = await createUser({
      email: `regular-${Date.now()}@example.com`,
      name: 'Regular User',
      role: 'user',
    });

    adminUser = await createUser({
      email: `admin-${Date.now()}@example.com`,
      name: 'Admin User',
      role: 'admin',
    });

    superadminUser = await createUser({
      email: `superadmin-${Date.now()}@example.com`,
      name: 'Superadmin User',
      role: 'superadmin',
    });

    // Generate tokens
    const regularTokens = await generateTestToken({
      id: regularUser.id,
      email: regularUser.email,
      role: regularUser.role,
    });
    regularToken = regularTokens.accessToken;

    const adminTokens = await generateTestToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });
    adminToken = adminTokens.accessToken;

    const superadminTokens = await generateTestToken({
      id: superadminUser.id,
      email: superadminUser.email,
      role: superadminUser.role,
    });
    superadminToken = superadminTokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/admin/users', () => {
    it('should list users as admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toBeInstanceOf(Array);
      expect(body.data.users.length).toBeGreaterThan(0);
      expect(body.data.pagination).toBeDefined();
      expect(body.data.pagination).toHaveProperty('page');
      expect(body.data.pagination).toHaveProperty('limit');
      expect(body.data.pagination).toHaveProperty('total');
      expect(body.data.pagination).toHaveProperty('totalPages');
    });

    it('should list users as superadmin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toBeInstanceOf(Array);
    });

    it('should deny access to regular users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: {
          authorization: `Bearer ${regularToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users?page=1&limit=2',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.limit).toBe(2);
      expect(body.data.users.length).toBeLessThanOrEqual(2);
    });

    it('should support search by email', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/users?search=${regularUser.email}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.users.length).toBeGreaterThan(0);
      expect(body.data.users[0].email).toContain(regularUser.email);
    });

    it('should support sorting by email asc', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users?sortBy=email&sortOrder=asc',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.users).toBeInstanceOf(Array);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/admin/users/stats', () => {
    it('should get user statistics as admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users/stats',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.total).toBeGreaterThan(0);
      expect(body.data.byRole).toBeInstanceOf(Array);
      expect(body.data.byProvider).toBeInstanceOf(Array);
    });

    it('should deny access to regular users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users/stats',
        headers: {
          authorization: `Bearer ${regularToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should get user by ID as admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${regularUser.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(regularUser.id);
      expect(body.data.email).toBe(regularUser.email);
      expect(body.data.role).toBe(regularUser.role);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users/99999',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('User not found');
    });

    it('should deny access to regular users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${regularUser.id}`,
        headers: {
          authorization: `Bearer ${regularToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PATCH /api/admin/users/:id/role', () => {
    it('should update user role from user to admin as admin', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${regularUser.id}/role`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          role: 'admin',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.role).toBe('admin');
      expect(body.message).toContain('User role updated to admin');
    });

    it('should update user role to superadmin as superadmin', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${regularUser.id}/role`,
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
        payload: {
          role: 'superadmin',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.role).toBe('superadmin');
    });

    it('should fail to promote to superadmin as admin', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${regularUser.id}/role`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          role: 'superadmin',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Only superadmins can promote users to superadmin');
    });

    it('should fail to change own role', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${adminUser.id}/role`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          role: 'user',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('You cannot change your own role');
    });

    it('should fail with invalid role', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${regularUser.id}/role`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          role: 'invalid-role',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should deny access to regular users', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${regularUser.id}/role`,
        headers: {
          authorization: `Bearer ${regularToken}`,
        },
        payload: {
          role: 'admin',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete regular user as admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${regularUser.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('User deleted successfully');
    });

    it('should fail to delete superadmin as admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${superadminUser.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Only superadmins can delete other superadmins');
    });

    it('should delete superadmin as superadmin', async () => {
      // Create another superadmin to delete
      const anotherSuperadmin = await createUser({
        email: `another-superadmin-${Date.now()}@example.com`,
        role: 'superadmin',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${anotherSuperadmin.id}`,
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should fail to delete own account', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${adminUser.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('You cannot delete your own account');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/admin/users/99999',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should deny access to regular users', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${regularUser.id}`,
        headers: {
          authorization: `Bearer ${regularToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Admin Integration Flow', () => {
    it('should complete full admin workflow', async () => {
      // 1. List users
      const list1 = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(list1.statusCode).toBe(200);

      // 2. Get specific user
      const get1 = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${regularUser.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(get1.statusCode).toBe(200);
      const body1 = JSON.parse(get1.body);
      expect(body1.data.role).toBe('user');

      // 3. Promote to admin
      const update1 = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${regularUser.id}/role`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { role: 'admin' },
      });
      expect(update1.statusCode).toBe(200);

      // 4. Verify promotion
      const get2 = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${regularUser.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const body2 = JSON.parse(get2.body);
      expect(body2.data.role).toBe('admin');

      // 5. Get stats
      const stats = await app.inject({
        method: 'GET',
        url: '/api/admin/users/stats',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(stats.statusCode).toBe(200);

      // 6. Demote back to user
      const update2 = await app.inject({
        method: 'PATCH',
        url: `/api/admin/users/${regularUser.id}/role`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { role: 'user' },
      });
      expect(update2.statusCode).toBe(200);

      // 7. Delete user
      const del = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${regularUser.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(del.statusCode).toBe(200);

      // 8. Verify deletion
      const get3 = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${regularUser.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(get3.statusCode).toBe(404);
    });
  });
});
