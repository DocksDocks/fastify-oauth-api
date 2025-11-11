import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from '../helper/app-helper';
import type { FastifyInstance } from 'fastify';

/**
 * Test suite for health check endpoint
 * Ensures the /health endpoint returns proper status information
 */

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status with all fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('status', 'ok');
      expect(body.data).toHaveProperty('timestamp');
      expect(body.data).toHaveProperty('uptime');
      expect(body.data).toHaveProperty('environment');
    });

    it('should return valid timestamp in ISO format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.body);
      const timestamp = body.data.timestamp;

      // Verify it's a valid ISO 8601 timestamp
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should return uptime as a number', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.body);

      expect(typeof body.data.uptime).toBe('number');
      expect(body.data.uptime).toBeGreaterThan(0);
    });

    it('should return environment information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.body);

      expect(typeof body.data.environment).toBe('string');
      expect(['development', 'production', 'test']).toContain(body.data.environment);
    });
  });
});
