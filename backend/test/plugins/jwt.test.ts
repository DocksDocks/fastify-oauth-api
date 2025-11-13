import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from '../helper/app-helper';
import type { FastifyInstance } from 'fastify';
import '../helper/setup';

/**
 * Test suite for JWT plugin
 * Ensures JWT authentication decorator works correctly
 */

describe('JWT Plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('JWT Plugin Registration', () => {
    it('should register JWT plugin successfully', () => {
      expect(app.jwt).toBeDefined();
      expect(typeof app.jwt.sign).toBe('function');
      expect(typeof app.jwt.verify).toBe('function');
    });

    it('should register authenticate decorator', () => {
      expect(app.authenticate).toBeDefined();
      expect(typeof app.authenticate).toBe('function');
    });
  });

  describe('JWT Signing and Verification', () => {
    it('should sign JWT token with valid payload', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = app.jwt.sign(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify valid JWT token', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = app.jwt.sign(payload);
      const decoded = app.jwt.verify(token);

      expect(decoded).toMatchObject(payload);
    });

    it('should reject invalid JWT token', () => {
      expect(() => {
        app.jwt.verify('invalid.token.here');
      }).toThrow();
    });

    it('should reject expired JWT token', async () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      // Sign token with 1ms expiry
      const token = app.jwt.sign(payload, { expiresIn: '1ms' });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(() => {
        app.jwt.verify(token);
      }).toThrow();
    });
  });

  describe('Authenticate Decorator', () => {
    it('should authenticate request with valid token', async () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = app.jwt.sign(payload);

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).not.toBe(401);
    });

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: 'InvalidFormat',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with missing Bearer prefix', async () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = app.jwt.sign(payload);

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: token, // Missing "Bearer " prefix
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('JWT Payload Validation', () => {
    it('should reject token with missing id field', async () => {
      // Create a token with incomplete payload (missing id)
      const incompletePayload = {
        email: 'test@example.com',
        role: 'user',
      };

      const token = app.jwt.sign(incompletePayload as Record<string, unknown>);

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject token with missing email field', async () => {
      const incompletePayload = {
        id: 1,
        role: 'user',
      };

      const token = app.jwt.sign(incompletePayload as Record<string, unknown>);

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject token with missing role field', async () => {
      const incompletePayload = {
        id: 1,
        email: 'test@example.com',
      };

      const token = app.jwt.sign(incompletePayload as Record<string, unknown>);

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should accept token with all required fields', async () => {
      const completePayload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = app.jwt.sign(completePayload);

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      // Should not be 401 (should authenticate successfully)
      expect(response.statusCode).not.toBe(401);
    });
  });

  describe('JWT Error Handling', () => {
    it('should handle expired token gracefully', async () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = app.jwt.sign(payload, { expiresIn: '1ms' });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should handle tampered token', async () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = app.jwt.sign(payload);

      // Tamper with the token by changing a character
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      const response = await app.inject({
        method: 'GET',
        url: '/api/profile',
        headers: {
          authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
