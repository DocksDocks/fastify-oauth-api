/**
 * JWT Utility Functions
 *
 * Provides reusable utilities for JWT token handling, including
 * decoding without verification and role checking.
 */

import type { FastifyRequest, FastifyInstance } from 'fastify';
import type { JWTPayload } from '@/modules/auth/auth.types';
import { extractTokenFromHeader } from '@/modules/auth/jwt.service';

/**
 * Decode JWT token without verification using Fastify JWT plugin
 *
 * This is useful for quickly extracting claims (like role) without the
 * overhead of full token verification. Use this when you need to check
 * claims for rate limiting or routing decisions, but NOT for authentication.
 *
 * @param fastify - Fastify instance with JWT plugin registered
 * @param token - JWT token string
 * @returns Decoded JWT payload or null if decoding fails
 *
 * @example
 * ```ts
 * const decoded = decodeJwtToken(app, token);
 * if (decoded?.role === 'admin') {
 *   // Skip rate limiting for admin
 * }
 * ```
 */
export function decodeJwtToken(
  fastify: FastifyInstance,
  token: string
): JWTPayload | null {
  try {
    return fastify.jwt.decode(token) as JWTPayload | null;
  } catch {
    return null;
  }
}

/**
 * Extract and decode JWT token from request Authorization header
 *
 * Combines extractTokenFromHeader and decodeJwtToken for convenience.
 * This is the most common use case for rate limiting and routing decisions.
 *
 * @param fastify - Fastify instance with JWT plugin registered
 * @param request - Fastify request object
 * @returns Decoded JWT payload or null if extraction/decoding fails
 *
 * @example
 * ```ts
 * const decoded = decodeRequestToken(app, request);
 * if (decoded?.role === 'admin' || decoded?.role === 'superadmin') {
 *   return true; // Skip rate limiting
 * }
 * ```
 */
export function decodeRequestToken(
  fastify: FastifyInstance,
  request: FastifyRequest
): JWTPayload | null {
  const token = extractTokenFromHeader(request.headers.authorization);
  if (!token) {
    return null;
  }

  return decodeJwtToken(fastify, token);
}

/**
 * Check if user has a specific role from decoded token
 *
 * @param decoded - Decoded JWT payload
 * @param role - Role to check for
 * @returns True if user has the specified role
 *
 * @example
 * ```ts
 * const decoded = decodeRequestToken(app, request);
 * if (hasRole(decoded, 'admin')) {
 *   // User is admin
 * }
 * ```
 */
export function hasRole(
  decoded: JWTPayload | null,
  role: 'user' | 'coach' | 'admin' | 'superadmin'
): boolean {
  return decoded?.role === role;
}

/**
 * Check if user has any of the specified roles from decoded token
 *
 * @param decoded - Decoded JWT payload
 * @param roles - Array of roles to check for
 * @returns True if user has any of the specified roles
 *
 * @example
 * ```ts
 * const decoded = decodeRequestToken(app, request);
 * if (hasAnyRole(decoded, ['admin', 'superadmin'])) {
 *   return true; // Skip rate limiting
 * }
 * ```
 */
export function hasAnyRole(
  decoded: JWTPayload | null,
  roles: Array<'user' | 'coach' | 'admin' | 'superadmin'>
): boolean {
  if (!decoded) {
    return false;
  }

  return roles.includes(decoded.role);
}
