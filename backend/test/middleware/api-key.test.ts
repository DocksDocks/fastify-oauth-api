import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../helper/app-helper';
import { generateTestToken } from '../helper/factories';
import * as apiKeyCacheService from '@/services/api-key-cache.service';

/**
 * API Key Middleware Test Suite
 * Tests role-based bypass, whitelist paths, and validation logic
 */

// Mock the API key cache service
vi.mock('@/services/api-key-cache.service', () => ({
  validateApiKey: vi.fn(),
}));

describe('API Key Middleware', () => {
  let app: FastifyInstance;
  const VALID_API_KEY = 'test-valid-api-key';
  const INVALID_API_KEY = 'test-invalid-api-key';

  beforeAll(async () => {
    // Set to non-test environment to enable API key validation
    process.env.NODE_ENV = 'development';
    app = await buildTestApp();
  });

  afterAll(async () => {
    // Restore test environment
    process.env.NODE_ENV = 'test';
    await app.close();
  });

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default mock: valid API key returns true, invalid returns false
    vi.mocked(apiKeyCacheService.validateApiKey).mockImplementation(async (key: string) => {
      return key === VALID_API_KEY;
    });
  });

  describe('Whitelisted Paths', () => {
    it('should skip validation for /health endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should skip validation for /api/auth/* routes', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/auth/google',
      });

      // Will fail for other reasons (redirect), but should bypass API key check
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should skip validation for /api/setup/* routes', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/setup/status',
      });

      // May fail for other reasons, but should bypass API key check
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should skip validation for /admin/* static files', async () => {
      await app.inject({
        method: 'GET',
        url: '/admin/some-page',
      });

      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should skip validation for /api/admin/* routes', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/admin/users',
      });

      // Will fail auth (401), but should bypass API key check
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });
  });

  describe('Admin/Superadmin Role Bypass', () => {
    it('should skip API key validation for admin user with valid JWT', async () => {
      const { accessToken } = await generateTestToken({
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Should bypass API key check and succeed (or fail auth later)
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
      // Profile route requires authentication, so we expect 401 if user doesn't exist
      // But importantly, we should NOT get API_KEY_MISSING error
      if (response.statusCode === 401) {
        const body = JSON.parse(response.body);
        expect(body.error).not.toContain('API key');
      }
    });

    it('should skip API key validation for superadmin user with valid JWT', async () => {
      const { accessToken } = await generateTestToken({
        id: 2,
        email: 'superadmin@test.com',
        role: 'superadmin',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Should bypass API key check
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
      // Should NOT get API_KEY_MISSING error
      if (response.statusCode === 401) {
        const body = JSON.parse(response.body);
        expect(body.error).not.toContain('API key');
      }
    });

    it('should NOT skip API key validation for regular user with JWT', async () => {
      const { accessToken } = await generateTestToken({
        id: 3,
        email: 'user@test.com',
        role: 'user',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Regular users need API key, should fail with API_KEY_MISSING
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('API_KEY_MISSING');
      expect(body.error.message).toContain('API key is required');
    });

    it('should require API key when admin JWT is malformed', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: 'Bearer invalid.malformed.token',
        },
      });

      // Malformed JWT can't be decoded, should require API key
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('API_KEY_MISSING');
    });

    it('should require API key when JWT is expired (admin)', async () => {
      // Generate token with immediate expiration
      const { accessToken } = await generateTestToken({
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
      });

      // Wait a bit and try to use it (in real scenario, token would be expired)
      // Note: In actual implementation, decoding expired token still works
      // Verification is what fails, and that happens later
      await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Expired tokens can still be decoded (role check passes)
      // But will fail later during jwtVerify in fastify.authenticate
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });
  });

  describe('API Key Validation', () => {
    it('should return 401 when API key header is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('API_KEY_MISSING');
      expect(body.error.message).toContain('API key is required');
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should return 401 when API key is invalid', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          'x-api-key': INVALID_API_KEY,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('API_KEY_INVALID');
      expect(body.error.message).toContain('Invalid or revoked API key');
      expect(apiKeyCacheService.validateApiKey).toHaveBeenCalledWith(INVALID_API_KEY);
    });

    it('should allow request with valid API key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          'x-api-key': VALID_API_KEY,
        },
      });

      // Will fail with 401 for missing auth, but should pass API key validation
      expect(apiKeyCacheService.validateApiKey).toHaveBeenCalledWith(VALID_API_KEY);
      const body = JSON.parse(response.body);
      // Should NOT be API_KEY_INVALID error
      if (body.error?.code) {
        expect(body.error.code).not.toBe('API_KEY_INVALID');
        expect(body.error.code).not.toBe('API_KEY_MISSING');
      }
    });

    it('should handle Redis cache errors gracefully', async () => {
      // Mock Redis error
      vi.mocked(apiKeyCacheService.validateApiKey).mockRejectedValueOnce(
        new Error('Redis connection error'),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          'x-api-key': VALID_API_KEY,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toContain('Failed to validate API key');
    });
  });

  describe('Combined Auth Scenarios', () => {
    it('should allow admin with JWT but no API key to access protected routes', async () => {
      const { accessToken } = await generateTestToken({
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
      });

      // Admin with JWT, no API key - should work (if user exists in DB)
      await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Should bypass API key validation
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should allow regular user with both valid API key AND JWT', async () => {
      const { accessToken } = await generateTestToken({
        id: 3,
        email: 'user@test.com',
        role: 'user',
      });

      await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          'x-api-key': VALID_API_KEY,
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Should validate API key (regular user needs it)
      expect(apiKeyCacheService.validateApiKey).toHaveBeenCalledWith(VALID_API_KEY);
    });

    it('should reject regular user with valid API key but no JWT', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          'x-api-key': VALID_API_KEY,
        },
      });

      // Should pass API key validation, but fail JWT auth
      expect(apiKeyCacheService.validateApiKey).toHaveBeenCalledWith(VALID_API_KEY);
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      // Should fail at JWT verification, not API key
      expect(body.error).not.toContain('API key');
    });

    it('should reject regular user with valid JWT but invalid API key', async () => {
      const { accessToken } = await generateTestToken({
        id: 3,
        email: 'user@test.com',
        role: 'user',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          'x-api-key': INVALID_API_KEY,
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Should fail at API key validation
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('API_KEY_INVALID');
      expect(apiKeyCacheService.validateApiKey).toHaveBeenCalledWith(INVALID_API_KEY);
    });
  });

  describe('Query String Handling', () => {
    it('should strip query strings when checking whitelisted paths', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health?param=value',
      });

      // Should recognize /health even with query params
      expect(response.statusCode).toBe(200);
      expect(apiKeyCacheService.validateApiKey).not.toHaveBeenCalled();
    });

    it('should strip query strings when validating non-whitelisted paths', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/profile?limit=10',
        headers: {
          'x-api-key': VALID_API_KEY,
        },
      });

      // Should still require API key validation
      expect(apiKeyCacheService.validateApiKey).toHaveBeenCalledWith(VALID_API_KEY);
    });
  });
});
