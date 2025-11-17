/**
 * Ingresse Routes
 * API endpoints for Ingresse ticketing platform integration
 */

import type { FastifyInstance } from 'fastify';
import {
  handleLogin,
  handleMfaVerify,
  handleLinkAccount,
  handleGetProfile,
  handleUnlink,
  handleSyncProfile,
} from '../controllers/ingresse.controller';

export default async function ingresseRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require JWT authentication
  fastify.addHook('onRequest', fastify.authenticate);

  /**
   * POST /api/tickets/login
   * Login to Ingresse platform
   * Public route (requires JWT but not admin)
   */
  fastify.post('/login', {
    schema: {
      description: 'Login to Ingresse ticketing platform',
      tags: ['tickets', 'ingresse'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Ingresse account email',
          },
          password: {
            type: 'string',
            minLength: 6,
            description: 'Ingresse account password',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            needsMfa: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                userId: { type: 'number' },
                authToken: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: handleLogin,
  });

  /**
   * POST /api/tickets/mfa/verify
   * Verify MFA code for Ingresse login
   */
  fastify.post('/mfa/verify', {
    schema: {
      description: 'Verify MFA code for Ingresse login',
      tags: ['tickets', 'ingresse'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['userToken', 'otp'],
        properties: {
          userToken: {
            type: 'string',
            description: 'User token from login response',
          },
          otp: {
            type: 'string',
            pattern: '^[0-9]{6}$',
            description: '6-digit MFA code',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                userId: { type: 'number' },
                authToken: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: handleMfaVerify,
  });

  /**
   * POST /api/tickets/link
   * Link Ingresse account to current user
   */
  fastify.post('/link', {
    schema: {
      description: 'Link Ingresse account to current user',
      tags: ['tickets', 'ingresse'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['token', 'userId'],
        properties: {
          token: {
            type: 'string',
            description: 'Ingresse user token',
          },
          userId: {
            type: 'number',
            description: 'Ingresse user ID',
          },
          authToken: {
            type: 'string',
            description: 'Ingresse auth token (JWT)',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: handleLinkAccount,
  });

  /**
   * GET /api/tickets/profile
   * Get current user's linked Ingresse profile
   */
  fastify.get('/profile', {
    schema: {
      description: 'Get linked Ingresse profile',
      tags: ['tickets', 'ingresse'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            profile: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                userId: { type: 'number' },
                ingresseUserId: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                birthdate: { type: 'string' },
                nationality: { type: 'string' },
                gender: { type: 'string' },
                phones: { type: 'array' },
                addresses: { type: 'array' },
                documents: { type: 'array' },
              },
            },
          },
        },
      },
    },
    handler: handleGetProfile,
  });

  /**
   * DELETE /api/tickets/unlink
   * Unlink Ingresse account from current user
   */
  fastify.delete('/unlink', {
    schema: {
      description: 'Unlink Ingresse account',
      tags: ['tickets', 'ingresse'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: handleUnlink,
  });

  /**
   * POST /api/tickets/sync
   * Sync Ingresse profile data from API
   */
  fastify.post('/sync', {
    schema: {
      description: 'Sync Ingresse profile data from API',
      tags: ['tickets', 'ingresse'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: handleSyncProfile,
  });
}
