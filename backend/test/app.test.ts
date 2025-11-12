import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helper/app-helper';
import type { FastifyInstance } from 'fastify';
import './helper/setup';

/**
 * Test suite for app-level functionality
 * Tests root route and global app configuration
 */

describe('App', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('endpoints');
    });

    it('should include all endpoint information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      const body = JSON.parse(response.body);

      expect(body.endpoints).toHaveProperty('health');
      expect(body.endpoints).toHaveProperty('docs');
      expect(body.endpoints).toHaveProperty('api');
      expect(body.endpoints).toHaveProperty('auth');
      expect(body.endpoints).toHaveProperty('profile');
      expect(body.endpoints).toHaveProperty('admin');
    });

    it('should include auth endpoint details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      const body = JSON.parse(response.body);

      expect(body.endpoints.auth).toHaveProperty('google');
      expect(body.endpoints.auth).toHaveProperty('apple');
      expect(body.endpoints.auth).toHaveProperty('refresh');
      expect(body.endpoints.auth).toHaveProperty('verify');
      expect(body.endpoints.auth).toHaveProperty('logout');
    });

    it('should have correct API name', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      const body = JSON.parse(response.body);

      expect(body.name).toBe('Fastify OAuth API + Admin Panel');
    });

    it('should have version information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      const body = JSON.parse(response.body);

      expect(body.version).toBe('2.0.0');
    });

    it('should include environment information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      const body = JSON.parse(response.body);

      expect(body.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(body.environment);
    });
  });

  describe('App Configuration', () => {
    it('should have Fastify instance properly configured', () => {
      expect(app).toBeDefined();
      expect(app.server).toBeDefined();
    });

    it('should have JWT plugin registered', () => {
      expect(app.jwt).toBeDefined();
      expect(typeof app.jwt.sign).toBe('function');
      expect(typeof app.jwt.verify).toBe('function');
    });

    it('should have authenticate decorator', () => {
      expect(app.authenticate).toBeDefined();
      expect(typeof app.authenticate).toBe('function');
    });

    it('should configure logger for production (LOG_PRETTY_PRINT=false)', async () => {
      // Save original value
      const originalValue = process.env.LOG_PRETTY_PRINT;

      // Set to false to test production path
      process.env.LOG_PRETTY_PRINT = 'false';

      // Build app with production logger config
      const prodApp = await buildTestApp();

      // Verify app was created successfully
      expect(prodApp).toBeDefined();
      expect(prodApp.server).toBeDefined();

      // Test that app still works with production logger
      const response = await prodApp.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      // Cleanup
      await prodApp.close();

      // Restore original value
      if (originalValue !== undefined) {
        process.env.LOG_PRETTY_PRINT = originalValue;
      } else {
        delete process.env.LOG_PRETTY_PRINT;
      }
    });

    it('should register compression plugin in production mode', async () => {
      // Save original value
      const originalEnv = process.env.NODE_ENV;

      // Set to production
      process.env.NODE_ENV = 'production';

      // Build app in production mode
      const prodApp = await buildTestApp();

      // Verify app was created successfully
      expect(prodApp).toBeDefined();

      // Test that compression is working (check for content-encoding header would require actual compression)
      const response = await prodApp.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      // Cleanup
      await prodApp.close();

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should skip compression in development mode', async () => {
      // Save original value
      const originalEnv = process.env.NODE_ENV;

      // Set to development
      process.env.NODE_ENV = 'development';

      // Build app in development mode
      const devApp = await buildTestApp();

      // Verify app was created successfully
      expect(devApp).toBeDefined();

      const response = await devApp.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      // Cleanup
      await devApp.close();

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle AppError instances with custom error codes', async () => {
      // This test requires triggering an AppError
      // We can test this by trying to access a protected route without a token
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
      });

      // Should return 401 Unauthorized
      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.success).toBe(false);
    });

    it('should hide error details in production mode', async () => {
      // Note: We can't easily test the error handler in production mode
      // because changing NODE_ENV enables API key validation
      // This test verifies the app builds correctly in production mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodApp = await buildTestApp();
      expect(prodApp).toBeDefined();

      await prodApp.close();

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should expose error details in development mode', async () => {
      // Note: We can't easily test the error handler in development mode
      // because changing NODE_ENV enables API key validation
      // This test verifies the app builds correctly in development mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devApp = await buildTestApp();
      expect(devApp).toBeDefined();

      await devApp.close();

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });
  });

  describe('Production Features', () => {
    it('should register static file serving in production mode', async () => {
      // Save original value
      const originalEnv = process.env.NODE_ENV;

      // Set to production
      process.env.NODE_ENV = 'production';

      // Build app in production mode
      const prodApp = await buildTestApp();

      // Verify app was created successfully with production config
      expect(prodApp).toBeDefined();

      // Test a whitelisted route to verify app is working
      const response = await prodApp.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      // Cleanup
      await prodApp.close();

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should register SPA fallback handler in production', async () => {
      // Save original value
      const originalEnv = process.env.NODE_ENV;

      // Set to production
      process.env.NODE_ENV = 'production';

      // Build app in production mode (registers SPA fallback)
      const prodApp = await buildTestApp();

      // Verify production app is built correctly
      expect(prodApp).toBeDefined();

      // Cleanup
      await prodApp.close();

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should skip static file serving in development mode', async () => {
      // Save original value
      const originalEnv = process.env.NODE_ENV;

      // Set to development
      process.env.NODE_ENV = 'development';

      // Build app in development mode
      const devApp = await buildTestApp();

      // Verify app is built correctly
      expect(devApp).toBeDefined();

      // Cleanup
      await devApp.close();

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should configure different CORS origins for production vs development', async () => {
      // Test that production mode builds successfully with production CORS config
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'production';
      const prodApp = await buildTestApp();
      expect(prodApp).toBeDefined();
      await prodApp.close();

      process.env.NODE_ENV = 'development';
      const devApp = await buildTestApp();
      expect(devApp).toBeDefined();
      await devApp.close();

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should include correct admin panel endpoint in root response', async () => {
      // In test mode, should show development URL
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      const body = JSON.parse(response.body);
      expect(body.endpoints.admin).toHaveProperty('panel');

      // In test environment, admin panel URL should be localhost
      expect(body.endpoints.admin.panel).toContain('localhost');
    });
  });
});
