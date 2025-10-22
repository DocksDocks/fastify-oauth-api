/**
 * JWT Token Service
 *
 * Handles JWT token generation, verification, and refresh with secure token rotation
 * Implements token storage, reuse detection, and revocation for enhanced security
 * Tokens include user role for RBAC authorization
 */

import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import type { User } from '@/db/schema/users';
import type { JWTPayload, TokenPair } from './auth.types';
import env from '@/config/env';
import { db } from '@/db/client';
import { refreshTokens } from '@/db/schema/refresh-tokens';
import { eq, and, lt } from 'drizzle-orm';

/**
 * Hash refresh token for secure storage using SHA-256
 * @param token - Plain text refresh token
 * @returns Hashed token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate access and refresh tokens for a user with database storage
 * @param fastify - Fastify instance with JWT plugin
 * @param user - User object
 * @param ipAddress - Optional IP address for session tracking
 * @param userAgent - Optional user agent for session tracking
 * @returns Token pair with access token, refresh token, and expiry
 */
export async function generateTokens(
  fastify: FastifyInstance,
  user: User,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair> {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  // Generate access token (short-lived)
  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
  });

  // Generate refresh token (long-lived) with unique jti to prevent hash collisions
  const refreshToken = fastify.jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    { expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );

  // Store refresh token in database for revocation and rotation
  const familyId = crypto.randomUUID(); // Unique ID for this token family (rotation chain)
  const refreshExpiresIn = parseExpiration(env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d');
  const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: hashToken(refreshToken), // Store hashed for security
    familyId,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });

  // Calculate access token expiration time in seconds
  const expiresIn = parseExpiration(env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m');

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(fastify: FastifyInstance, token: string): Promise<JWTPayload> {
  try {
    const decoded = fastify.jwt.verify<JWTPayload>(token);
    return decoded;
  } catch (error) {
    const err = error as Error;
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

/**
 * Refresh access token with token rotation and reuse detection
 * @param fastify - Fastify instance with JWT plugin
 * @param refreshToken - Refresh token to validate and rotate
 * @param ipAddress - Optional IP address for new token tracking
 * @param userAgent - Optional user agent for new token tracking
 * @returns New access token and refresh token pair
 */
export async function refreshAccessToken(
  fastify: FastifyInstance,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  try {
    // 1. Verify JWT signature and decode payload
    const decoded = await verifyToken(fastify, refreshToken);
    const hashedToken = hashToken(refreshToken);

    // 2. Check if token exists in database
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, hashedToken), eq(refreshTokens.userId, decoded.id)))
      .limit(1);

    if (!storedToken) {
      throw new Error('Refresh token not found in database');
    }

    // 3. Check if token has been revoked
    if (storedToken.isRevoked) {
      throw new Error('Refresh token has been revoked');
    }

    // 4. Check if token has already been used (REUSE DETECTION)
    if (storedToken.isUsed) {
      // Token reuse detected! This indicates a potential security breach.
      // Revoke the entire token family to prevent further damage.
      await db
        .update(refreshTokens)
        .set({ isRevoked: true, revokedAt: new Date() })
        .where(eq(refreshTokens.familyId, storedToken.familyId));

      throw new Error(
        'Token reuse detected - all tokens in family revoked for security. Please re-authenticate.'
      );
    }

    // 5. Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // 6. Mark old token as used
    await db
      .update(refreshTokens)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(refreshTokens.id, storedToken.id));

    // 7. Generate new access token
    const payload: JWTPayload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    const newAccessToken = fastify.jwt.sign(payload, {
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    });

    // 8. Generate new refresh token (TOKEN ROTATION) with unique jti
    const newRefreshToken = fastify.jwt.sign(
      { ...payload, jti: crypto.randomUUID() },
      { expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d' }
    );

    // 9. Store new refresh token with same family ID (rotation chain)
    const refreshExpiresIn = parseExpiration(env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d');
    const expiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

    const [newTokenRecord] = await db
      .insert(refreshTokens)
      .values({
        userId: decoded.id,
        token: hashToken(newRefreshToken),
        familyId: storedToken.familyId, // Keep same family for rotation chain
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      })
      .returning();

    // 10. Link old token to new token for audit trail
    await db
      .update(refreshTokens)
      .set({ replacedBy: newTokenRecord!.id })
      .where(eq(refreshTokens.id, storedToken.id));

    const expiresIn = parseExpiration(env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m');

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    };
  } catch (error) {
    const err = error as Error;
    throw new Error(`Token refresh failed: ${err.message}`);
  }
}

/**
 * Parse expiration string (e.g., "15m", "7d") to seconds
 */
function parseExpiration(exp: string): number {
  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };

  const match = exp.match(/^(\d+)([smhdw])$/);
  /* v8 ignore next 3 - Unreachable: regex already validates format */
  if (!match) {
    throw new Error(`Invalid expiration format: ${exp}`);
  }

  const [, value, unit] = match;
  const multiplier = units[unit!];
  /* v8 ignore next 3 - Unreachable: regex already validates unit is [smhdw] */
  if (multiplier === undefined) {
    throw new Error(`Invalid time unit: ${unit}`);
  }
  return parseInt(value!, 10) * multiplier;
}

/**
 * Decode token without verification (for debugging only)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Revoke a single refresh token (logout from specific device)
 * @param token - Plain text refresh token to revoke
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const hashedToken = hashToken(token);

  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(eq(refreshTokens.token, hashedToken));
}

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 * @param userId - User ID whose tokens to revoke
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.isRevoked, false)));
}

/**
 * Revoke an entire token family (logout from all devices in rotation chain)
 * Used when token reuse is detected or user wants to invalidate a token chain
 * @param familyId - Family ID of tokens to revoke
 */
export async function revokeTokenFamily(familyId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(eq(refreshTokens.familyId, familyId));
}

/**
 * Clean up expired and used refresh tokens
 * Should be run periodically (e.g., daily cron job) to prevent database bloat
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await db
    .delete(refreshTokens)
    .where(and(lt(refreshTokens.expiresAt, new Date()), eq(refreshTokens.isUsed, true)));
}

/**
 * Get active sessions for a user
 * @param userId - User ID to get sessions for
 * @returns List of active refresh tokens (sessions)
 */
export async function getUserSessions(userId: number) {
  return await db
    .select({
      id: refreshTokens.id,
      familyId: refreshTokens.familyId,
      createdAt: refreshTokens.createdAt,
      expiresAt: refreshTokens.expiresAt,
      ipAddress: refreshTokens.ipAddress,
      userAgent: refreshTokens.userAgent,
      isUsed: refreshTokens.isUsed,
      usedAt: refreshTokens.usedAt,
    })
    .from(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.isRevoked, false)))
    .orderBy(refreshTokens.createdAt);
}

/**
 * Revoke a specific session by ID
 * @param sessionId - Refresh token ID to revoke
 * @param userId - User ID (for authorization check)
 */
export async function revokeSession(sessionId: number, userId: number): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date() })
    .where(and(eq(refreshTokens.id, sessionId), eq(refreshTokens.userId, userId)));
}
