/**
 * OAuth Authentication Controller
 *
 * Route handlers for OAuth authentication flows
 * Handles Google and Apple Sign-In with JWT token generation
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { LoginResponse } from './auth.types';
import {
  handleGoogleOAuth,
  handleAppleOAuth,
  handleOAuthCallback,
  getGoogleAuthUrl,
  getAppleAuthUrl,
} from './auth.service';
import { generateTokens, refreshAccessToken, verifyToken } from './jwt.service';

/**
 * Generate Google OAuth authorization URL
 * GET /api/auth/google
 */
export async function handleGoogleLogin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        provider: 'google',
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      }),
    ).toString('base64');

    const authUrl = getGoogleAuthUrl(state);

    return reply.send({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    request.log.error({ error }, 'Google login failed');
    return reply.status(500).send({
      success: false,
      error: 'Failed to generate Google OAuth URL',
    });
  }
}

/**
 * Handle Google OAuth callback
 * GET /api/auth/google/callback?code=...&state=...
 */
export async function handleGoogleCallback(
  request: FastifyRequest<{
    Querystring: { code: string; state?: string; error?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { code, error } = request.query;

    // Check for OAuth errors
    if (error) {
      request.log.warn({ error }, 'Google OAuth error');
      return reply.status(400).send({
        success: false,
        error: `Google OAuth error: ${error}`,
      });
    }

    if (!code) {
      return reply.status(400).send({
        success: false,
        error: 'Missing authorization code',
      });
    }

    // Exchange code for user profile
    const profile = await handleGoogleOAuth(code);

    // Create or update user
    const user = await handleOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(request.server, user);

    const response: LoginResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
        tokens,
      },
    };

    return reply.send(response);
  } catch (error) {
    request.log.error({ error }, 'Google callback failed');
    return reply.status(500).send({
      success: false,
      error: 'Google authentication failed',
    });
  }
}

/**
 * Generate Apple OAuth authorization URL
 * GET /api/auth/apple
 */
export async function handleAppleLogin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        provider: 'apple',
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      }),
    ).toString('base64');

    const authUrl = getAppleAuthUrl(state);

    return reply.send({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    request.log.error({ error }, 'Apple login failed');
    return reply.status(500).send({
      success: false,
      error: 'Failed to generate Apple OAuth URL',
    });
  }
}

/**
 * Handle Apple OAuth callback
 * POST /api/auth/apple/callback
 * Body: { code, id_token, state, user? }
 */
export async function handleAppleCallback(
  request: FastifyRequest<{
    Body: {
      code: string;
      id_token: string;
      state?: string;
      user?: string;
      error?: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { code, id_token, user, error } = request.body;

    // Check for OAuth errors
    if (error) {
      request.log.warn({ error }, 'Apple OAuth error');
      return reply.status(400).send({
        success: false,
        error: `Apple OAuth error: ${error}`,
      });
    }

    if (!code || !id_token) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required Apple OAuth parameters',
      });
    }

    // Verify ID token and get user profile
    const profile = await handleAppleOAuth(code, id_token, user);

    // Create or update user
    const userRecord = await handleOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(request.server, userRecord);

    const response: LoginResponse = {
      success: true,
      data: {
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          avatar: userRecord.avatar,
          role: userRecord.role,
        },
        tokens,
      },
    };

    return reply.send(response);
  } catch (error) {
    request.log.error({ error }, 'Apple callback failed');
    return reply.status(500).send({
      success: false,
      error: 'Apple authentication failed',
    });
  }
}

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
export async function handleRefreshToken(
  request: FastifyRequest<{
    Body: { refreshToken: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: 'Missing refresh token',
      });
    }

    // Generate new access token
    const tokens = await refreshAccessToken(request.server, refreshToken);

    return reply.send({
      success: true,
      data: tokens,
    });
  } catch (error) {
    request.log.error({ error }, 'Token refresh failed');
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired refresh token',
    });
  }
}

/**
 * Logout user (invalidate tokens)
 * POST /api/auth/logout
 * Note: JWT tokens are stateless, so we just return success
 * Client should discard tokens
 */
export async function handleLogout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // In a stateless JWT system, logout happens client-side
    // For enhanced security, you could implement a token blacklist in Redis
    // For now, just return success and let client discard tokens

    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Logout failed');
    return reply.status(500).send({
      success: false,
      error: 'Logout failed',
    });
  }
}

/**
 * Verify current token and return user info
 * GET /api/auth/verify
 * Header: Authorization: Bearer <token>
 */
export async function handleVerifyToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(request.server, token);

    return reply.send({
      success: true,
      data: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Token verification failed');
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Handle Google OAuth for mobile apps
 * POST /api/auth/google/mobile
 * Body: { code: string }
 *
 * Mobile flow:
 * 1. App opens OAuth URL in-app browser
 * 2. User authenticates with Google
 * 3. Google redirects to myapp://oauth/callback?code=xyz
 * 4. App captures code from deep link
 * 5. App sends code to this endpoint
 * 6. Backend exchanges code for user info and returns JWT
 */
export async function handleGoogleMobileAuth(
  request: FastifyRequest<{
    Body: { code: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { code } = request.body;

    if (!code) {
      return reply.status(400).send({
        success: false,
        error: 'Missing authorization code',
      });
    }

    // Exchange code for user profile (same as web flow)
    const profile = await handleGoogleOAuth(code);

    // Create or update user
    const user = await handleOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(request.server, user);

    const response: LoginResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
        },
        tokens,
      },
    };

    return reply.send(response);
  } catch (error) {
    request.log.error({ error }, 'Google mobile auth failed');
    return reply.status(500).send({
      success: false,
      error: 'Google mobile authentication failed',
    });
  }
}

/**
 * Handle Apple OAuth for mobile apps
 * POST /api/auth/apple/mobile
 * Body: { code: string, id_token: string, user?: string }
 *
 * Mobile flow:
 * 1. App opens OAuth URL in-app browser
 * 2. User authenticates with Apple
 * 3. Apple redirects to myapp://oauth/callback with code and id_token
 * 4. App captures data from deep link
 * 5. App sends code and id_token to this endpoint
 * 6. Backend verifies and returns JWT
 */
export async function handleAppleMobileAuth(
  request: FastifyRequest<{
    Body: {
      code: string;
      id_token: string;
      user?: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { code, id_token, user } = request.body;

    if (!code || !id_token) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required parameters (code and id_token)',
      });
    }

    // Verify ID token and get user profile (same as web flow)
    const profile = await handleAppleOAuth(code, id_token, user);

    // Create or update user
    const userRecord = await handleOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(request.server, userRecord);

    const response: LoginResponse = {
      success: true,
      data: {
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          avatar: userRecord.avatar,
          role: userRecord.role,
        },
        tokens,
      },
    };

    return reply.send(response);
  } catch (error) {
    request.log.error({ error }, 'Apple mobile auth failed');
    return reply.status(500).send({
      success: false,
      error: 'Apple mobile authentication failed',
    });
  }
}
