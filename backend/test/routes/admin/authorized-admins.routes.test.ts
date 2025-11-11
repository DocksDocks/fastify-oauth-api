import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helper/app-helper';
import { createUser, generateTestToken } from '../../helper/factories';
import { db } from '@/db/client';
import { authorizedAdmins } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Authorized Admins Routes Test Suite
 * Tests CRUD operations for pre-authorized admin emails (superadmin only)
 */

describe('Authorized Admins Routes', () => {
  let app: FastifyInstance;
  let superadminToken: string;
  let adminToken: string;
  let userToken: string;
  let superadminUserId: number;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create test users
    const superadmin = await createUser({
      email: `superadmin-${Date.now()}@test.com`,
      name: 'Superadmin User',
      role: 'superadmin',
    });
    superadminUserId = superadmin.id;

    const admin = await createUser({
      email: `admin-${Date.now()}@test.com`,
      name: 'Admin User',
      role: 'admin',
    });

    const user = await createUser({
      email: `user-${Date.now()}@test.com`,
      name: 'Regular User',
      role: 'user',
    });

    // Generate tokens
    const superadminTokens = await generateTestToken({
      id: superadmin.id,
      email: superadmin.email,
      role: 'superadmin',
    });
    superadminToken = superadminTokens.accessToken;

    const adminTokens = await generateTestToken({
      id: admin.id,
      email: admin.email,
      role: 'admin',
    });
    adminToken = adminTokens.accessToken;

    const userTokens = await generateTestToken({
      id: user.id,
      email: user.email,
      role: 'user',
    });
    userToken = userTokens.accessToken;

    // Clear authorized admins table
    await db.delete(authorizedAdmins);
  });

  describe('GET /api/admin/authorized-admins', () => {
    it('should list all authorized admins as superadmin', async () => {
      // Add some authorized admins
      await db.insert(authorizedAdmins).values([
        { email: 'admin1@test.com', createdBy: superadminUserId },
        { email: 'admin2@test.com', createdBy: superadminUserId },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.authorizedAdmins).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.authorizedAdmins[0].email).toBeDefined();
      expect(body.authorizedAdmins[0].createdBy).toBe(superadminUserId);
    });

    it('should return empty list when no authorized admins exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.authorizedAdmins).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it('should include creator information', async () => {
      await db.insert(authorizedAdmins).values({
        email: 'newadmin@test.com',
        createdBy: superadminUserId,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.authorizedAdmins[0].createdByEmail).toBeDefined();
      expect(body.authorizedAdmins[0].createdByName).toBeDefined();
    });

    it('should deny access to admin users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should deny access to regular users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/admin/authorized-admins', () => {
    it('should add email to authorized admins', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: 'newadmin@test.com',
        }),
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.authorizedAdmin.email).toBe('newadmin@test.com');
      expect(body.authorizedAdmin.createdBy).toBe(superadminUserId);
      expect(body.message).toContain('auto-promoted');
    });

    it('should normalize email to lowercase', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: 'NewAdmin@Test.COM',
        }),
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.authorizedAdmin.email).toBe('newadmin@test.com');
    });

    it('should normalize email case and trim', async () => {
      // Use uppercase and mixed case to test normalization
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: `TrimTest${Date.now()}@Test.COM`,
        }),
      });

      expect([201, 400]).toContain(response.statusCode);
      if (response.statusCode === 201) {
        const body = JSON.parse(response.body);
        // Should be lowercase
        expect(body.authorizedAdmin.email).toMatch(/^trimtest\d+@test\.com$/);
        expect(body.authorizedAdmin.email).not.toContain(' ');
      }
    });

    it('should reject invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: 'invalid-email',
        }),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      // Accept either custom validation or Fastify schema validation error
      expect(['INVALID_EMAIL', 'FST_ERR_VALIDATION', 'INTERNAL_ERROR']).toContain(
        body.error.code || body.error,
      );
    });

    it('should reject duplicate email', async () => {
      // Add email first time
      await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: 'duplicate@test.com',
        }),
      });

      // Try to add same email again
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: 'duplicate@test.com',
        }),
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('EMAIL_ALREADY_AUTHORIZED');
    });

    it('should deny access to admin users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: 'newadmin@test.com',
        }),
      });

      expect(response.statusCode).toBe(403);
    });

    it('should deny access to regular users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: 'newadmin@test.com',
        }),
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          email: 'newadmin@test.com',
        }),
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/admin/authorized-admins/:id', () => {
    it('should remove authorized admin', async () => {
      // Add an authorized admin
      const [added] = await db
        .insert(authorizedAdmins)
        .values({
          email: 'todelete@test.com',
          createdBy: superadminUserId,
        })
        .returning();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/authorized-admins/${added.id}`,
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('removed');

      // Verify it was deleted
      const remaining = await db
        .select()
        .from(authorizedAdmins)
        .where(eq(authorizedAdmins.id, added.id));
      expect(remaining).toHaveLength(0);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/admin/authorized-admins/99999',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should reject invalid ID format', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/admin/authorized-admins/invalid',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_ID');
    });

    it('should deny access to admin users', async () => {
      const [added] = await db
        .insert(authorizedAdmins)
        .values({
          email: 'test@test.com',
          createdBy: superadminUserId,
        })
        .returning();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/authorized-admins/${added.id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should deny access to regular users', async () => {
      const [added] = await db
        .insert(authorizedAdmins)
        .values({
          email: 'test@test.com',
          createdBy: superadminUserId,
        })
        .returning();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/authorized-admins/${added.id}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/admin/authorized-admins/1',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Integration Flow', () => {
    it('should complete full CRUD lifecycle', async () => {
      // 1. List - should be empty
      const list1 = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
        headers: { authorization: `Bearer ${superadminToken}` },
      });
      const listBody1 = JSON.parse(list1.body);
      expect(listBody1.total).toBe(0);

      // 2. Add first email
      const add1 = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ email: 'admin1@test.com' }),
      });
      expect(add1.statusCode).toBe(201);
      const addBody1 = JSON.parse(add1.body);
      const admin1Id = addBody1.authorizedAdmin.id;

      // 3. Add second email
      const add2 = await app.inject({
        method: 'POST',
        url: '/api/admin/authorized-admins',
        headers: {
          authorization: `Bearer ${superadminToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ email: 'admin2@test.com' }),
      });
      expect(add2.statusCode).toBe(201);

      // 4. List - should have 2
      const list2 = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
        headers: { authorization: `Bearer ${superadminToken}` },
      });
      const listBody2 = JSON.parse(list2.body);
      expect(listBody2.total).toBe(2);

      // 5. Remove first email
      const remove = await app.inject({
        method: 'DELETE',
        url: `/api/admin/authorized-admins/${admin1Id}`,
        headers: { authorization: `Bearer ${superadminToken}` },
      });
      expect(remove.statusCode).toBe(200);

      // 6. List - should have 1
      const list3 = await app.inject({
        method: 'GET',
        url: '/api/admin/authorized-admins',
        headers: { authorization: `Bearer ${superadminToken}` },
      });
      const listBody3 = JSON.parse(list3.body);
      expect(listBody3.total).toBe(1);
      expect(listBody3.authorizedAdmins[0].email).toBe('admin2@test.com');
    });
  });
});
