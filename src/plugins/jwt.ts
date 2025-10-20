/**
 * JWT Plugin
 *
 * Configures @fastify/jwt for token signing and verification
 * Provides authentication decorator for protecting routes
 */

import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { JWTPayload } from '@/modules/auth/auth.types';
import env from '@/config/env';

/**
 * JWT plugin configuration
 */
export default fp(async (fastify: FastifyInstance) => {
  // Register @fastify/jwt
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      algorithm: 'HS256',
      expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    },
    verify: {
      algorithms: ['HS256'],
    },
  });

  // Add authenticate decorator for route protection
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify JWT token from Authorization header
      await request.jwtVerify<JWTPayload>();

      // Token payload is now available in request.user
      // Type assertion to ensure JWTPayload structure
      const payload = request.user as JWTPayload;

      if (!payload || !payload.id || !payload.email || !payload.role) {
        throw new Error('Invalid token payload');
      }

      // Attach typed user to request
      request.user = payload;
    } catch (error) {
      const err = error as Error;
      request.log.warn({ error: err.message }, 'JWT authentication failed');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized - Invalid or expired token',
      });
    }
  });

  fastify.log.info('JWT plugin registered');
});

// Export types for TypeScript support
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}
