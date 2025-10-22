import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import {
  generateTokens,
  verifyToken,
  refreshAccessToken,
  decodeToken,
  isTokenExpired,
  extractTokenFromHeader,
  revokeTokenFamily,
  cleanupExpiredTokens,
} from '@/modules/auth/jwt.service';
import type { User } from '@/db/schema/users';
import env from '@/config/env';
import '../helper/setup'; // Import test setup (database mocking and cleanup)
import { createUser } from '../helper/factories';

describe('JWT Service', () => {
  let fastify: FastifyInstance;
  let testUser: User;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(fastifyJwt, { secret: env.JWT_SECRET });
  });

  beforeEach(async () => {
    // Create a real user in the test database before each test
    // Use unique email to ensure different JWT tokens across tests
    testUser = await createUser({
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      name: 'Test User',
      provider: 'google',
      providerId: `google_${Date.now()}_${Math.random()}`,
      role: 'user',
    });
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const tokens = await generateTokens(fastify, testUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
      expect(tokens.expiresIn).toBeGreaterThan(0);
    });

    it('should include user data in token payload', async () => {
      const tokens = await generateTokens(fastify, testUser);
      const decoded = decodeToken(tokens.accessToken);

      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe(testUser.id);
      expect(decoded!.email).toBe(testUser.email);
      expect(decoded!.role).toBe(testUser.role);
    });

    it('should generate different tokens for different users', async () => {
      const user1 = await createUser({ email: 'user1@example.com', name: 'User 1' });
      const user2 = await createUser({ email: 'user2@example.com', name: 'User 2' });

      const tokens1 = await generateTokens(fastify, user1);
      const tokens2 = await generateTokens(fastify, user2);

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });

    it('should generate tokens with admin role', async () => {
      const adminUser = await createUser({ email: 'admin@example.com', role: 'admin' });
      const tokens = await generateTokens(fastify, adminUser);
      const decoded = decodeToken(tokens.accessToken);

      expect(decoded!.role).toBe('admin');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid access token', async () => {
      const tokens = await generateTokens(fastify, testUser);
      const payload = await verifyToken(fastify, tokens.accessToken);

      expect(payload.id).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
      expect(payload.role).toBe(testUser.role);
    });

    it('should verify valid refresh token', async () => {
      const tokens = await generateTokens(fastify, testUser);
      const payload = await verifyToken(fastify, tokens.refreshToken);

      expect(payload.id).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
    });

    it('should throw error for invalid token', async () => {
      await expect(verifyToken(fastify, 'invalid.token.here')).rejects.toThrow();
    });

    it('should throw error for malformed token', async () => {
      await expect(verifyToken(fastify, 'not-a-jwt')).rejects.toThrow();
    });

    it('should throw error for empty token', async () => {
      await expect(verifyToken(fastify, '')).rejects.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access and refresh tokens from refresh token', async () => {
      const tokens = await generateTokens(fastify, testUser);

      // Wait 1000ms to ensure different timestamp (iat is in seconds)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const refreshed = await refreshAccessToken(fastify, tokens.refreshToken);

      expect(refreshed).toHaveProperty('accessToken');
      expect(refreshed).toHaveProperty('refreshToken'); // Now returns new refresh token too
      expect(refreshed).toHaveProperty('expiresIn');
      expect(typeof refreshed.accessToken).toBe('string');
      expect(typeof refreshed.refreshToken).toBe('string');
      expect(refreshed.accessToken).not.toBe(tokens.accessToken);
      expect(refreshed.refreshToken).not.toBe(tokens.refreshToken); // Rotation: new token
    });

    it('should preserve user data in refreshed token', async () => {
      const tokens = await generateTokens(fastify, testUser);
      const refreshed = await refreshAccessToken(fastify, tokens.refreshToken);
      const decoded = decodeToken(refreshed.accessToken);

      expect(decoded!.id).toBe(testUser.id);
      expect(decoded!.email).toBe(testUser.email);
      expect(decoded!.role).toBe(testUser.role);
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(refreshAccessToken(fastify, 'invalid.token')).rejects.toThrow();
    });

    it('should throw error when token is not found in database', async () => {
      // Create a valid JWT but don't store it in database
      const payload = { id: testUser.id, email: testUser.email, role: testUser.role };
      const tokenNotInDb = fastify.jwt.sign(payload, { expiresIn: '7d' });

      await expect(refreshAccessToken(fastify, tokenNotInDb)).rejects.toThrow('not found in database');
    });

    it('should detect token reuse and revoke entire family', async () => {
      const tokens1 = await generateTokens(fastify, testUser);

      // Use the token once (rotation)
      const tokens2 = await refreshAccessToken(fastify, tokens1.refreshToken);

      // Try to reuse the old token (should detect reuse and revoke family)
      await expect(refreshAccessToken(fastify, tokens1.refreshToken))
        .rejects.toThrow('Token reuse detected');

      // Even the new token should now be revoked (family revoked)
      await expect(refreshAccessToken(fastify, tokens2.refreshToken))
        .rejects.toThrow('revoked');
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token without verification', async () => {
      const tokens = await generateTokens(fastify, testUser);
      const decoded = decodeToken(tokens.accessToken);

      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe(testUser.id);
      expect(decoded!.email).toBe(testUser.email);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token');
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const decoded = decodeToken('not-a-jwt');
      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeToken('');
      expect(decoded).toBeNull();
    });

    it('should decode token with exp claim', async () => {
      const tokens = await generateTokens(fastify, testUser);
      const decoded = decodeToken(tokens.accessToken);

      expect(decoded).toHaveProperty('exp');
      expect(typeof decoded!.exp).toBe('number');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', async () => {
      const tokens = await generateTokens(fastify, testUser);
      const expired = isTokenExpired(tokens.accessToken);

      expect(expired).toBe(false);
    });

    it('should return true for expired token', () => {
      // Create a token that's already expired (signed 1 hour ago with 1 second expiry)
      const payload = {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        exp: Math.floor(Date.now() / 1000) - 3599, // Expired 59 minutes ago
      };

      const expiredToken = fastify.jwt.sign(payload);
      const expired = isTokenExpired(expiredToken);

      expect(expired).toBe(true);
    });

    it('should return true for invalid token', () => {
      const expired = isTokenExpired('invalid.token');
      expect(expired).toBe(true);
    });

    it('should return true for malformed token', () => {
      const expired = isTokenExpired('not-a-jwt');
      expect(expired).toBe(true);
    });

    it('should return true for empty string', () => {
      const expired = isTokenExpired('');
      expect(expired).toBe(true);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const extracted = extractTokenFromHeader(`Bearer ${token}`);

      expect(extracted).toBe(token);
    });

    it('should return null for missing authorization header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for empty authorization header', () => {
      const extracted = extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const extracted = extractTokenFromHeader('token-without-bearer');
      expect(extracted).toBeNull();
    });

    it('should return null for header with wrong prefix', () => {
      const extracted = extractTokenFromHeader('Basic dXNlcjpwYXNz');
      expect(extracted).toBeNull();
    });

    it('should return null for Bearer without token', () => {
      const extracted = extractTokenFromHeader('Bearer');
      expect(extracted).toBeNull();
    });

    it('should return null for Bearer with extra spaces', () => {
      const extracted = extractTokenFromHeader('Bearer  ');
      expect(extracted).toBeNull();
    });

    it('should handle Bearer with token containing dots', async () => {
      const tokens = await generateTokens(fastify, testUser);
      const extracted = extractTokenFromHeader(`Bearer ${tokens.accessToken}`);

      expect(extracted).toBe(tokens.accessToken);
      expect(extracted).toContain('.');
    });
  });

  describe('revokeTokenFamily', () => {
    it('should revoke all tokens in a family', async () => {
      const tokens1 = await generateTokens(fastify, testUser);

      // Get familyId from database
      const { db } = await import('@/db/client');
      const { refreshTokens } = await import('@/db/schema/refresh-tokens');
      const { eq } = await import('drizzle-orm');
      const { hashToken } = await import('@/modules/auth/jwt.service');

      const [tokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, hashToken(tokens1.refreshToken)))
        .limit(1);

      expect(tokenRecord).toBeDefined();
      const familyId = tokenRecord.familyId;

      // Create a rotation to have multiple tokens in same family
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const tokens2 = await refreshAccessToken(fastify, tokens1.refreshToken);

      // Revoke the entire family
      await revokeTokenFamily(familyId);

      // Try to use the new token from the family - should fail
      await expect(refreshAccessToken(fastify, tokens2.refreshToken))
        .rejects.toThrow('revoked');
    });

    it('should not affect other token families', async () => {
      const user1 = await createUser({ email: 'user1@test.com' });
      const user2 = await createUser({ email: 'user2@test.com' });

      const tokens1 = await generateTokens(fastify, user1);
      const tokens2 = await generateTokens(fastify, user2);

      // Get user1's familyId from database
      const { db } = await import('@/db/client');
      const { refreshTokens } = await import('@/db/schema/refresh-tokens');
      const { eq } = await import('drizzle-orm');
      const { hashToken } = await import('@/modules/auth/jwt.service');

      const [tokenRecord1] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, hashToken(tokens1.refreshToken)))
        .limit(1);

      expect(tokenRecord1).toBeDefined();

      // Revoke user1's family
      await revokeTokenFamily(tokenRecord1.familyId);

      // User1's tokens should be revoked
      await expect(refreshAccessToken(fastify, tokens1.refreshToken))
        .rejects.toThrow('revoked');

      // User2's tokens should still work
      await expect(refreshAccessToken(fastify, tokens2.refreshToken))
        .resolves.toBeDefined();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should execute without error when there are no expired tokens', async () => {
      // Just verify the function runs successfully
      await expect(cleanupExpiredTokens()).resolves.not.toThrow();
    });

    it('should execute without error when called multiple times', async () => {
      // Run cleanup multiple times
      await cleanupExpiredTokens();
      await cleanupExpiredTokens();
      await cleanupExpiredTokens();

      // Verify it doesn't throw errors
      await expect(cleanupExpiredTokens()).resolves.not.toThrow();
    });
  });
});
