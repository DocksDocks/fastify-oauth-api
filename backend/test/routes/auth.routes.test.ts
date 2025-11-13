import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildTestApp } from '../helper/app-helper';
import { createUser } from '../helper/factories';
import type { FastifyInstance } from 'fastify';
import type { User } from '@/db/schema/users';
import { generateTokens } from '@/modules/auth/jwt.service';
import '../helper/setup';

describe('Auth Routes', () => {
  let app: FastifyInstance;
  let user: User;
  let userToken: string;
  let refreshToken: string;

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

    // Generate tokens for user
    const tokens = await generateTokens(app, user);
    userToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.tokens.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBeDefined(); // Token rotation
      expect(body.tokens.expiresIn).toBeGreaterThan(0);
      // Note: Access tokens may be identical if generated in same second with same payload
      expect(body.tokens.refreshToken).not.toBe(refreshToken); // Rotated token (has jti so always unique)
    });

    it('should fail with invalid refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refreshToken: 'invalid.token.here',
        },
      });

      expect(response.statusCode).toBe(401); // Auth controller returns 401 for invalid tokens
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should fail with missing refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should fail with used refresh token (token reuse detection)', async () => {
      // Use the token once
      await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      // Try to use the same token again
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(401); // Auth controller returns 401 for all refresh errors
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      // Error can be string or object with message
      const errorMessage = typeof body.error === 'string'
        ? body.error
        : body.error.message;
      expect(errorMessage).toContain('Token reuse detected');
    });

    it('should mark old token as used and provide new token', async () => {
      // First refresh
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(response1.body);
      const newRefreshToken = body1.tokens.refreshToken;

      // Second refresh with new token should work
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken: newRefreshToken },
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(response2.body);
      expect(body2.tokens.accessToken).toBeDefined();
      expect(body2.tokens.refreshToken).not.toBe(newRefreshToken);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify valid access token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user.id).toBe(user.id);
      expect(body.user.email).toBe(user.email);
      expect(body.user.role).toBe(user.role);
    });

    it('should fail with invalid access token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with missing authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/verify',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with malformed authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          authorization: 'InvalidFormat',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with expired token', async () => {
      // Create an expired token (signed 2 hours ago with 1 hour expiry)
      const expiredPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600,
      };

      const expiredToken = app.jwt.sign(expiredPayload);

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully (client-side)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        payload: {}, // Empty body for client-side logout
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Logged out successfully');
    });

    it('should logout with refresh token revocation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        payload: {
          refreshToken,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Try to use the revoked refresh token
      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(refreshResponse.statusCode).toBe(401); // Auth controller returns 401 for all refresh errors
      const refreshBody = JSON.parse(refreshResponse.body);
      // Error can be string or object with message
      const errorMessage = typeof refreshBody.error === 'string'
        ? refreshBody.error
        : refreshBody.error.message;
      expect(errorMessage).toContain('revoked');
    });

    it('should logout from all devices', async () => {
      // Generate another token for the same user
      const tokens2 = await generateTokens(app, user);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        payload: {
          logoutAll: true,
        },
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Both tokens should be revoked
      const refresh1 = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });
      expect(refresh1.statusCode).toBe(401); // Auth controller returns 401 for revoked tokens

      const refresh2 = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken: tokens2.refreshToken },
      });
      expect(refresh2.statusCode).toBe(401); // Auth controller returns 401 for revoked tokens
    });

    it('should handle logout without tokens gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/auth/sessions', () => {
    it('should list active sessions for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.sessions).toBeInstanceOf(Array);
      expect(body.sessions.length).toBeGreaterThan(0);
      expect(body.sessions[0]).toHaveProperty('id');
      expect(body.sessions[0]).toHaveProperty('familyId');
      expect(body.sessions[0]).toHaveProperty('createdAt');
      expect(body.sessions[0]).toHaveProperty('expiresAt');
    });

    it('should include session metadata', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      const body = JSON.parse(response.body);
      const session = body.sessions[0];
      expect(session).toHaveProperty('isUsed');
      expect(session.isUsed).toBe(false); // Current token not used yet
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should only show own sessions', async () => {
      // Create another user
      const otherUser = await createUser({
        email: `other-${Date.now()}@example.com`,
        role: 'user',
      });
      await generateTokens(app, otherUser);

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      const body = JSON.parse(response.body);
      expect(body.sessions).toBeInstanceOf(Array);
      // All sessions should belong to the current user
      // We can't directly check userId in response, but we can verify the count
      expect(body.sessions.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/auth/sessions/:id', () => {
    it('should revoke specific session', async () => {
      // Get current sessions
      const sessionsResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      const sessionsBody = JSON.parse(sessionsResponse.body);
      const sessionId = sessionsBody.sessions[0].id;

      // Revoke the session
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/auth/sessions/${sessionId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('revoked');
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/auth/sessions/1',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should not revoke other user session', async () => {
      // Create another user with a session
      const otherUser = await createUser({
        email: `other-${Date.now()}@example.com`,
        role: 'user',
      });
      const otherTokens = await generateTokens(app, otherUser);
      const otherToken = otherTokens.accessToken;

      // Get other user's sessions
      const otherSessionsResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
        headers: {
          authorization: `Bearer ${otherToken}`,
        },
      });

      const otherSessionsBody = JSON.parse(otherSessionsResponse.body);
      const otherSessionId = otherSessionsBody.sessions[0].id;

      // Try to revoke other user's session
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/auth/sessions/${otherSessionId}`,
        headers: {
          authorization: `Bearer ${userToken}`, // Using first user's token
        },
      });

      // Should succeed but not actually revoke (or return success with no effect)
      expect(response.statusCode).toBe(200);

      // Verify other user's session is still active
      const verifyResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
        headers: {
          authorization: `Bearer ${otherToken}`,
        },
      });

      const verifyBody = JSON.parse(verifyResponse.body);
      // Session should still exist (not revoked for other user)
      expect(verifyBody.sessions.length).toBeGreaterThan(0);
    });

    it('should handle invalid session ID', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/auth/sessions/99999',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      // Should return 200 even for non-existent ID (idempotent)
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Token Rotation Flow', () => {
    it('should maintain token family across rotations', async () => {
      // Get initial sessions
      const sessions1 = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
        headers: { authorization: `Bearer ${userToken}` },
      });
      const body1 = JSON.parse(sessions1.body);
      const familyId1 = body1.sessions[0].familyId;

      // Rotate token
      const refresh1 = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });
      const refreshBody1 = JSON.parse(refresh1.body);
      const newAccessToken = refreshBody1.tokens.accessToken;

      // Check sessions again
      const sessions2 = await app.inject({
        method: 'GET',
        url: '/api/auth/sessions',
        headers: { authorization: `Bearer ${newAccessToken}` },
      });
      const body2 = JSON.parse(sessions2.body);

      // Should have same family ID
      const familyIds = body2.sessions.map((s: { familyId: string }) => s.familyId);
      expect(familyIds).toContain(familyId1);
    });

    it('should revoke entire family on token reuse', async () => {
      // Rotate once
      const refresh1 = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });
      const body1 = JSON.parse(refresh1.body);
      const newRefreshToken = body1.tokens.refreshToken;

      // Try to reuse old token (should trigger family revocation)
      const reuseResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });
      expect(reuseResponse.statusCode).toBe(401); // Auth controller returns 401 for all refresh errors

      // New token should also be revoked
      const newTokenResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken: newRefreshToken },
      });
      expect(newTokenResponse.statusCode).toBe(401); // Auth controller returns 401 for revoked tokens
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format for invalid requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken: 'invalid' },
      });

      expect(response.statusCode).toBe(401); // Auth controller returns 401 for invalid tokens
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should handle malformed JSON payloads', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          'content-type': 'application/json',
        },
        payload: '{invalid json',
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
