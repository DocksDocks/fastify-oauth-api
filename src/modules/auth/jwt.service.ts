/**
 * JWT Token Service
 *
 * Handles JWT token generation, verification, and refresh
 * Tokens include user role for RBAC authorization
 */

import type { FastifyInstance } from 'fastify';
import type { User } from '@/db/schema/users';
import type { JWTPayload, TokenPair } from './auth.types';
import env from '@/config/env';

/**
 * Generate access and refresh tokens for a user
 */
export async function generateTokens(fastify: FastifyInstance, user: User): Promise<TokenPair> {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  // Generate access token (short-lived)
  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
  });

  // Generate refresh token (long-lived)
  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  });

  // Calculate expiration time in seconds
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
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  fastify: FastifyInstance,
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  try {
    // Verify refresh token
    const decoded = await verifyToken(fastify, refreshToken);

    // Generate new access token with same payload
    const payload: JWTPayload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    const accessToken = fastify.jwt.sign(payload, {
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    });

    const expiresIn = parseExpiration(env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m');

    return {
      accessToken,
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
  if (!match) {
    throw new Error(`Invalid expiration format: ${exp}`);
  }

  const [, value, unit] = match;
  const multiplier = units[unit!];
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
