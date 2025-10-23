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
      expect(body.endpoints).toHaveProperty('exercises');
      expect(body.endpoints).toHaveProperty('workouts');
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

      expect(body.name).toBe('Fastify OAuth API - Gym Workout Tracker + Admin Panel');
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
  });
});
