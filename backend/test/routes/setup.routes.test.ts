import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../helper/app-helper';
import { db } from '@/db/client';
import { users, setupStatus, apiKeys, authorizedAdmins } from '@/db/schema';
import { createUser, generateTestToken } from '../helper/factories';

/**
 * Setup Routes Test Suite
 * Tests first-time setup wizard endpoints
 */

describe('Setup Routes', () => {
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

    // Clear setup-specific tables (but NOT users)
    await db.delete(authorizedAdmins);
    await db.delete(apiKeys);

    // Ensure setup status record exists and is not complete
    const existing = await db.select().from(setupStatus);
    if (existing.length === 0) {
      await db.insert(setupStatus).values({
        isSetupComplete: false,
        completedAt: null,
      });
    } else {
      await db.update(setupStatus).set({
        isSetupComplete: false,
        completedAt: null,
      });
    }
  });

  describe('GET /api/setup/status', () => {
    it('should return setup status when not complete', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/setup/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.setupComplete).toBe(false);
      expect(body.data.hasUsers).toBe(true); // We created test users
      expect(body.data.hasApiKeys).toBe(false);
    });

    it('should return setup status when complete', async () => {
      // Mark setup as complete
      await db.update(setupStatus).set({
        isSetupComplete: true,
        completedAt: new Date(),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/setup/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.setupComplete).toBe(true);
    });

    it('should not require authentication', async () => {
      // No authorization header
      const response = await app.inject({
        method: 'GET',
        url: '/api/setup/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should detect when API keys exist', async () => {
      // Create an API key
      await db.insert(apiKeys).values({
        name: 'test_api_key',
        keyHash: 'hash123',
        createdBy: superadminUserId,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/setup/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.hasApiKeys).toBe(true);
    });
  });

  describe('POST /api/setup/initialize', () => {
    it('should initialize setup successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Setup completed successfully');
      expect(body.data.apiKeys).toBeDefined();
      expect(body.data.apiKeys.ios).toBeDefined();
      expect(body.data.apiKeys.android).toBeDefined();
      expect(body.data.apiKeys.web).toBeDefined();

      // Verify API keys match expected format
      expect(body.data.apiKeys.ios).toMatch(/^ak_[a-f0-9]{64}$/);
      expect(body.data.apiKeys.android).toMatch(/^ak_[a-f0-9]{64}$/);
      expect(body.data.apiKeys.web).toMatch(/^ak_[a-f0-9]{64}$/);
    });

    it('should create API keys in database', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      // Verify API keys were created
      const keys = await db.select().from(apiKeys);
      expect(keys).toHaveLength(3);

      const keyNames = keys.map((k) => k.name).sort();
      expect(keyNames).toEqual(['android_api_key', 'ios_api_key', 'web_api_key']);
    });

    it('should mark setup as complete', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      // Verify setup status was updated
      const statuses = await db.select().from(setupStatus);
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses[0].isSetupComplete).toBe(true);
      expect(statuses[0].completedAt).toBeInstanceOf(Date);
    });

    it('should reject if setup already complete', async () => {
      // Mark setup as complete
      await db.update(setupStatus).set({
        isSetupComplete: true,
        completedAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('already complete');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should work for any authenticated user', async () => {
      // Regular user should be able to initialize setup
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should work for admin users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should add user to authorized admins', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      // Verify user was added to authorized admins
      const admins = await db.select().from(authorizedAdmins);
      expect(admins.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/setup/reset', () => {
    it('should reset setup successfully as superadmin', async () => {
      // First, initialize setup
      await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      // Verify setup is complete
      const beforeStatus = await db.select().from(setupStatus);
      expect(beforeStatus[0].isSetupComplete).toBe(true);

      // Reset setup
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/reset',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('reset successfully');
    });

    it('should clear all data when resetting', async () => {
      // Initialize setup first
      await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      // Verify data exists
      const beforeKeys = await db.select().from(apiKeys);
      expect(beforeKeys.length).toBeGreaterThan(0);

      // Reset
      await app.inject({
        method: 'POST',
        url: '/api/setup/reset',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      // Verify data was cleared
      const afterKeys = await db.select().from(apiKeys);
      const afterUsers = await db.select().from(users);
      const afterAdmins = await db.select().from(authorizedAdmins);

      expect(afterKeys).toHaveLength(0);
      expect(afterUsers).toHaveLength(0);
      expect(afterAdmins).toHaveLength(0);
    });

    it('should reset setup status', async () => {
      // Initialize setup
      await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      // Reset
      await app.inject({
        method: 'POST',
        url: '/api/setup/reset',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      // Verify setup status was reset
      const statuses = await db.select().from(setupStatus);
      if (statuses.length > 0) {
        expect(statuses[0].isSetupComplete).toBe(false);
        expect(statuses[0].completedAt).toBeNull();
      }
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/reset',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should deny access to regular users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/reset',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should deny access to admin users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/reset',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should only allow superadmin', async () => {
      // Superadmin should succeed
      const response = await app.inject({
        method: 'POST',
        url: '/api/setup/reset',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Integration Flow', () => {
    it('should complete full setup lifecycle', async () => {
      // 1. Check status - should not be complete
      const status1 = await app.inject({
        method: 'GET',
        url: '/api/setup/status',
      });
      const statusBody1 = JSON.parse(status1.body);
      expect(statusBody1.data.setupComplete).toBe(false);

      // 2. Initialize setup
      const init = await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });
      expect(init.statusCode).toBe(200);
      const initBody = JSON.parse(init.body);
      expect(initBody.data.apiKeys.ios).toBeDefined();

      // 3. Check status - should now be complete
      const status2 = await app.inject({
        method: 'GET',
        url: '/api/setup/status',
      });
      const statusBody2 = JSON.parse(status2.body);
      expect(statusBody2.data.setupComplete).toBe(true);
      expect(statusBody2.data.hasApiKeys).toBe(true);

      // 4. Try to initialize again - should fail
      const init2 = await app.inject({
        method: 'POST',
        url: '/api/setup/initialize',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });
      expect(init2.statusCode).toBe(400);

      // 5. Reset setup
      const reset = await app.inject({
        method: 'POST',
        url: '/api/setup/reset',
        headers: {
          authorization: `Bearer ${superadminToken}`,
        },
      });
      expect(reset.statusCode).toBe(200);

      // 6. Check status - should be incomplete again
      const status3 = await app.inject({
        method: 'GET',
        url: '/api/setup/status',
      });
      const statusBody3 = JSON.parse(status3.body);
      expect(statusBody3.data.setupComplete).toBe(false);
      expect(statusBody3.data.hasApiKeys).toBe(false);
    });
  });
});
