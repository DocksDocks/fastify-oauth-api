/**
 * OAuth Authentication Controller
 *
 * Route handlers for OAuth authentication flows
 * Handles Google and Apple Sign-In with JWT token generation
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { LoginResponse } from './auth.types';
import env from '@/config/env';
import {
  handleGoogleOAuth,
  handleAppleOAuth,
  handleOAuthCallback,
  handleAdminOAuthCallback,
  getGoogleAuthUrl,
  getAppleAuthUrl,
  getGoogleAuthUrlAdmin,
  getAppleAuthUrlAdmin,
  verifyGoogleIdToken,
  getUserById,
} from './auth.service';
import {
  generateTokens,
  refreshAccessToken,
  verifyToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getUserSessions,
  revokeSession,
  extractTokenFromHeader,
} from './jwt.service';

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
      // Redirect to frontend with error
      return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      // Redirect to frontend with error
      return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=missing_code`);
    }

    // Exchange code for user profile (legacy callback - not used by mobile app)
    // Mobile app now uses POST /api/auth/google/mobile instead
    // This endpoint is only for web-based callbacks
    const profile = await handleGoogleOAuth(code, env.GOOGLE_REDIRECT_URI_ADMIN, 'web');

    // Create or update user
    const user = await handleOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(
      request.server,
      user,
      request.ip,
      request.headers['user-agent']
    );

    // Redirect to frontend with tokens in URL hash (not sent to server)
    const tokenData = encodeURIComponent(JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      tokens,
    }));

    return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback#data=${tokenData}`);
  } catch (error) {
    request.log.error({ error }, 'Google callback failed');
    // Redirect to frontend with error
    return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=authentication_failed`);
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
      // Redirect to frontend with error
      return reply.redirect(`/admin/auth/callback?error=${encodeURIComponent(error)}`);
    }

    if (!code || !id_token) {
      // Redirect to frontend with error
      return reply.redirect('/admin/auth/callback?error=missing_parameters');
    }

    // Verify ID token and get user profile
    const profile = await handleAppleOAuth(code, id_token, user);

    // Create or update user
    const userRecord = await handleOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(
      request.server,
      userRecord,
      request.ip,
      request.headers['user-agent']
    );

    // Redirect to frontend with tokens in URL hash (not sent to server)
    const tokenData = encodeURIComponent(JSON.stringify({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        avatar: userRecord.avatar,
        role: userRecord.role,
      },
      tokens,
    }));

    return reply.redirect(`/admin/auth/callback#data=${tokenData}`);
  } catch (error) {
    request.log.error({ error }, 'Apple callback failed');
    // Redirect to frontend with error
    return reply.redirect('/admin/auth/callback?error=authentication_failed');
  }
}

/**
 * Generate Google OAuth authorization URL for admin panel
 * GET /api/auth/admin/google
 */
export async function handleAdminGoogleLogin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        provider: 'google',
        admin: true,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      }),
    ).toString('base64');

    const authUrl = getGoogleAuthUrlAdmin(state);

    return reply.send({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    request.log.error({ error }, 'Admin Google login failed');
    return reply.status(500).send({
      success: false,
      error: 'Failed to generate Google OAuth URL',
    });
  }
}

/**
 * Handle Google OAuth callback for admin panel
 * GET /api/auth/admin/google/callback?code=...&state=...
 */
export async function handleAdminGoogleCallback(
  request: FastifyRequest<{
    Querystring: { code: string; state?: string; error?: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { code, error } = request.query;

    // Check for OAuth errors
    if (error) {
      request.log.warn({ error }, 'Admin Google OAuth error');
      // Redirect to frontend with error
      return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      // Redirect to frontend with error
      return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=missing_code`);
    }

    // Exchange code for user profile (admin panel web flow)
    const profile = await handleGoogleOAuth(code, env.GOOGLE_REDIRECT_URI_ADMIN!, 'web');

    // Validate user is existing admin/superadmin (does NOT create users)
    const user = await handleAdminOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(
      request.server,
      user,
      request.ip,
      request.headers['user-agent']
    );

    // Redirect to frontend with tokens in URL hash (not sent to server)
    const tokenData = encodeURIComponent(JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      tokens,
    }));

    return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback#data=${tokenData}`);
  } catch (error) {
    request.log.error({ error }, 'Admin Google callback failed');
    const err = error as Error;
    // Use error message from handleAdminOAuthCallback for better UX
    const errorMsg = encodeURIComponent(err.message || 'authentication_failed');
    return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=${errorMsg}`);
  }
}

/**
 * Generate Apple OAuth authorization URL for admin panel
 * GET /api/auth/admin/apple
 */
export async function handleAdminAppleLogin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        provider: 'apple',
        admin: true,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      }),
    ).toString('base64');

    const authUrl = getAppleAuthUrlAdmin(state);

    return reply.send({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    request.log.error({ error }, 'Admin Apple login failed');
    return reply.status(500).send({
      success: false,
      error: 'Failed to generate Apple OAuth URL',
    });
  }
}

/**
 * Handle Apple OAuth callback for admin panel
 * POST /api/auth/admin/apple/callback
 * Body: { code, id_token, state, user? }
 */
export async function handleAdminAppleCallback(
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
      request.log.warn({ error }, 'Admin Apple OAuth error');
      // Redirect to frontend with error
      return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=${encodeURIComponent(error)}`);
    }

    if (!code || !id_token) {
      // Redirect to frontend with error
      return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=missing_parameters`);
    }

    // Verify ID token and get user profile
    const profile = await handleAppleOAuth(code, id_token, user);

    // Validate user is existing admin/superadmin (does NOT create users)
    const userRecord = await handleAdminOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(
      request.server,
      userRecord,
      request.ip,
      request.headers['user-agent']
    );

    // Redirect to frontend with tokens in URL hash (not sent to server)
    const tokenData = encodeURIComponent(JSON.stringify({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        avatar: userRecord.avatar,
        role: userRecord.role,
      },
      tokens,
    }));

    return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback#data=${tokenData}`);
  } catch (error) {
    request.log.error({ error }, 'Admin Apple callback failed');
    const err = error as Error;
    // Use error message from handleAdminOAuthCallback for better UX
    const errorMsg = encodeURIComponent(err.message || 'authentication_failed');
    return reply.redirect(`${env.ADMIN_PANEL_URL}/admin/auth/callback?error=${errorMsg}`);
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

    // Refresh access token with rotation and reuse detection
    const tokens = await refreshAccessToken(
      request.server,
      refreshToken,
      request.ip,
      request.headers['user-agent']
    );

    return reply.send({
      success: true,
      data: tokens,
    });
  } catch (error) {
    request.log.error(error, 'Token refresh failed');
    const err = error as Error;
    return reply.status(401).send({
      success: false,
      error: err.message || 'Invalid or expired refresh token',
    });
  }
}

/**
 * Logout user (revoke refresh tokens)
 * POST /api/auth/logout
 * Body: { refreshToken?, logoutAll? }
 */
export async function handleLogout(
  request: FastifyRequest<{
    Body: { refreshToken?: string; logoutAll?: boolean };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { refreshToken, logoutAll } = request.body;
    const user = request.user; // May or may not be authenticated

    if (logoutAll && user) {
      // Logout from all devices (requires authentication)
      await revokeAllUserTokens(user.id);
      return reply.send({
        success: true,
        data: { message: 'Logged out from all devices successfully' },
      });
    } else if (refreshToken) {
      // Logout from this device only
      await revokeRefreshToken(refreshToken);
      return reply.send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } else {
      // No token provided, just return success (client-side logout)
      return reply.send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    }
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
    const token = extractTokenFromHeader(request.headers.authorization);

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const payload = await verifyToken(request.server, token);

    // Fetch full user object from database
    const user = await getUserById(payload.id);

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          provider: user.provider,
          providerId: user.providerId,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() || null,
        },
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
 * Get user's active sessions
 * GET /api/auth/sessions
 * Requires authentication
 */
export async function handleGetSessions(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const user = request.user!; // User from JWT authentication

    const sessions = await getUserSessions(user.id);

    return reply.send({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get sessions');
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve sessions',
    });
  }
}

/**
 * Revoke a specific session
 * DELETE /api/auth/sessions/:id
 * Requires authentication
 */
export async function handleRevokeSession(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const user = request.user!; // User from JWT authentication
    const sessionId = parseInt(request.params.id, 10);

    if (isNaN(sessionId)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid session ID',
      });
    }

    await revokeSession(sessionId, user.id);

    return reply.send({
      success: true,
      data: { message: 'Session revoked successfully' },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to revoke session');
    return reply.status(500).send({
      success: false,
      error: 'Failed to revoke session',
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
    Body: { code: string; redirectUri: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { code, redirectUri } = request.body;

    if (!code) {
      return reply.status(400).send({
        success: false,
        error: 'Missing authorization code',
      });
    }

    if (!redirectUri) {
      return reply.status(400).send({
        success: false,
        error: 'Missing redirect URI',
      });
    }

    // Log the redirect URI for debugging
    console.log('[Google Mobile Auth] Using redirect URI:', redirectUri);

    // Exchange code for user profile (mobile flow with webClientId)
    // When webClientId is provided to expo-auth-session, Google expects web client for exchange
    // Use the redirect URI provided by the client (must match what was used to obtain the code)
    const profile = await handleGoogleOAuth(code, redirectUri, 'web');

    // Create or update user
    const user = await handleOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(
      request.server,
      user,
      request.ip,
      request.headers['user-agent']
    );

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
 * Handle Google OAuth with ID token for mobile apps (native SDK)
 * POST /api/auth/google/id-token
 * Body: { idToken: string }
 *
 * Native SDK flow:
 * 1. App uses @react-native-google-signin/google-signin
 * 2. SDK handles OAuth natively (no redirect)
 * 3. SDK returns ID token
 * 4. App sends ID token to this endpoint
 * 5. Backend verifies ID token with Google
 * 6. Backend returns JWT
 */
export async function handleGoogleIdTokenAuth(
  request: FastifyRequest<{
    Body: { idToken: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { idToken } = request.body;

    if (!idToken) {
      return reply.status(400).send({
        success: false,
        error: 'Missing ID token',
      });
    }

    console.log('[Google ID Token Auth] Verifying ID token');

    // Verify ID token with Google
    const profile = await verifyGoogleIdToken(idToken);

    // Create or update user
    const user = await handleOAuthCallback(profile);

    // Generate JWT tokens
    const tokens = await generateTokens(
      request.server,
      user,
      request.ip,
      request.headers['user-agent']
    );

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
    request.log.error({ error }, 'Google ID token auth failed');
    return reply.status(500).send({
      success: false,
      error: 'Google ID token authentication failed',
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
    const tokens = await generateTokens(
      request.server,
      userRecord,
      request.ip,
      request.headers['user-agent']
    );

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
