/**
 * API Key Validation Middleware
 *
 * Validates X-API-Key header on all routes except whitelisted paths
 * Uses Redis cache for fast validation (no database query on every request)
 *
 * Usage:
 *   Add as global hook in app.ts: app.addHook('onRequest', validateApiKey)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { validateApiKey as validateFromCache } from '@/services/api-key-cache.service';

/**
 * Routes that don't require API key validation
 * - Health check: Public endpoint
 * - Auth routes: OAuth callbacks and initial authentication
 * - Admin static files: Frontend assets
 * - Admin API routes: Use JWT authentication instead of API keys
 */
const WHITELISTED_PATHS = [
  '/health',
  '/api/auth/*', // All auth routes (OAuth callbacks, login, etc.)
  '/admin/*', // Admin panel static files and routes
  '/api/admin/*', // Admin API routes (use JWT auth instead)
];

/**
 * Check if request path is whitelisted (doesn't require API key)
 */
function isWhitelisted(path: string): boolean {
  return WHITELISTED_PATHS.some((whitelisted) => {
    if (whitelisted.endsWith('*')) {
      // Wildcard match (e.g., /admin/*, /api/auth/*)
      return path.startsWith(whitelisted.slice(0, -1));
    }
    // Exact match
    return path === whitelisted;
  });
}

/**
 * API Key validation middleware
 *
 * Validates the X-API-Key header against cached keys in Redis
 * Skips validation for whitelisted paths and test environment
 */
export async function validateApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Skip validation for whitelisted paths
  // Extract pathname without query string for matching
  const pathname = request.url.split('?')[0];
  if (isWhitelisted(pathname)) {
    return;
  }

  // Check for API key header
  const apiKeyHeader = request.headers['x-api-key'] as string | undefined;

  if (!apiKeyHeader) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'API_KEY_MISSING',
        message: 'API key is required. Include X-API-Key header in your request.',
      },
    });
  }

  try {
    // Validate API key against Redis cache
    const isValid = await validateFromCache(apiKeyHeader);

    if (!isValid) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'API_KEY_INVALID',
          message: 'Invalid or revoked API key.',
        },
      });
    }

    // Log API key usage (optional, for monitoring)
    request.log.debug(
      {
        method: request.method,
        url: request.url,
      },
      'API key validated',
    );
  } catch (error) {
    request.log.error({ error }, 'Failed to validate API key');
    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate API key',
      },
    });
  }
}
