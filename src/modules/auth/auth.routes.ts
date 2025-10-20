/**
 * OAuth Authentication Routes
 *
 * Registers all authentication endpoints:
 * - Google OAuth flow
 * - Apple OAuth flow
 * - Token management (refresh, verify, logout)
 */

import type { FastifyInstance } from 'fastify';
import {
  handleGoogleLogin,
  handleGoogleCallback,
  handleAppleLogin,
  handleAppleCallback,
  handleRefreshToken,
  handleLogout,
  handleVerifyToken,
  handleGoogleMobileAuth,
  handleAppleMobileAuth,
} from './auth.controller';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Google OAuth Routes
  fastify.get('/google', {
    schema: {
      description: 'Initiate Google OAuth flow',
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                authUrl: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: handleGoogleLogin,
  });

  fastify.get('/google/callback', {
    schema: {
      description: 'Handle Google OAuth callback',
      tags: ['auth'],
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          error: { type: 'string' },
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
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string' },
                    name: { type: 'string', nullable: true },
                    avatar: { type: 'string', nullable: true },
                    role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
                  },
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: handleGoogleCallback,
  });

  // Apple OAuth Routes
  fastify.get('/apple', {
    schema: {
      description: 'Initiate Apple OAuth flow',
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                authUrl: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: handleAppleLogin,
  });

  fastify.post('/apple/callback', {
    schema: {
      description: 'Handle Apple OAuth callback',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['code', 'id_token'],
        properties: {
          code: { type: 'string' },
          id_token: { type: 'string' },
          state: { type: 'string' },
          user: { type: 'string' },
          error: { type: 'string' },
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
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string' },
                    name: { type: 'string', nullable: true },
                    avatar: { type: 'string', nullable: true },
                    role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
                  },
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: handleAppleCallback,
  });

  // Token Management Routes
  fastify.post('/refresh', {
    schema: {
      description: 'Refresh access token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
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
                accessToken: { type: 'string' },
                expiresIn: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: handleRefreshToken,
  });

  fastify.get('/verify', {
    schema: {
      description: 'Verify current access token',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
              },
            },
          },
        },
      },
    },
    handler: handleVerifyToken,
  });

  fastify.post('/logout', {
    schema: {
      description: 'Logout (client should discard tokens)',
      tags: ['auth'],
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
    handler: handleLogout,
  });

  // Mobile OAuth Routes
  fastify.post('/google/mobile', {
    schema: {
      description: 'Handle Google OAuth for mobile apps',
      tags: ['auth', 'mobile'],
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: {
            type: 'string',
            description: 'Authorization code received from Google OAuth redirect',
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
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string' },
                    name: { type: 'string', nullable: true },
                    avatar: { type: 'string', nullable: true },
                    role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
                  },
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: handleGoogleMobileAuth,
  });

  fastify.post('/apple/mobile', {
    schema: {
      description: 'Handle Apple OAuth for mobile apps',
      tags: ['auth', 'mobile'],
      body: {
        type: 'object',
        required: ['code', 'id_token'],
        properties: {
          code: {
            type: 'string',
            description: 'Authorization code from Apple',
          },
          id_token: {
            type: 'string',
            description: 'ID token from Apple',
          },
          user: {
            type: 'string',
            description: 'User data (JSON string, only on first login)',
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
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string' },
                    name: { type: 'string', nullable: true },
                    avatar: { type: 'string', nullable: true },
                    role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
                  },
                },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: handleAppleMobileAuth,
  });
}
