/**
 * OAuth Authentication Routes
 *
 * Registers all authentication endpoints:
 * - Google OAuth flow (regular users - mobile app)
 * - Apple OAuth flow (regular users - mobile app)
 * - Admin panel OAuth flows (existing admins only)
 * - Token management (refresh, verify, logout)
 * - Session management
 */

import type { FastifyInstance } from 'fastify';
import { optionalAuth } from '@/middleware/authorize';
import {
  handleGoogleLogin,
  handleGoogleCallback,
  handleAppleLogin,
  handleAppleCallback,
  handleAdminGoogleLogin,
  handleAdminGoogleCallback,
  handleAdminAppleLogin,
  handleAdminAppleCallback,
  handleRefreshToken,
  handleLogout,
  handleVerifyToken,
  handleGoogleMobileAuth,
  handleGoogleIdTokenAuth,
  handleAppleMobileAuth,
  handleGetSessions,
  handleRevokeSession,
  handleLinkProvider,
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

  // Admin Panel OAuth Routes (admin-only, no user creation)
  fastify.get('/admin/google', {
    schema: {
      description: 'Initiate Google OAuth flow for admin panel (admins only)',
      tags: ['auth', 'admin'],
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
    handler: handleAdminGoogleLogin,
  });

  fastify.get('/admin/google/callback', {
    schema: {
      description: 'Handle Google OAuth callback for admin panel',
      tags: ['auth', 'admin'],
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          error: { type: 'string' },
        },
      },
    },
    handler: handleAdminGoogleCallback,
  });

  fastify.get('/admin/apple', {
    schema: {
      description: 'Initiate Apple OAuth flow for admin panel (admins only)',
      tags: ['auth', 'admin'],
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
    handler: handleAdminAppleLogin,
  });

  fastify.post('/admin/apple/callback', {
    schema: {
      description: 'Handle Apple OAuth callback for admin panel',
      tags: ['auth', 'admin'],
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
    },
    handler: handleAdminAppleCallback,
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
                refreshToken: { type: 'string' }, // Token rotation - return new refresh token
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
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string' },
                    name: { type: ['string', 'null'] },
                    avatar: { type: ['string', 'null'] },
                    role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
                    provider: { type: 'string' },
                    providerId: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    lastLoginAt: { type: ['string', 'null'] },
                  },
                },
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
      description: 'Logout (revoke refresh tokens)',
      tags: ['auth'],
      body: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
          logoutAll: { type: 'boolean' },
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
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    preHandler: optionalAuth, // Optional auth: populates request.user if token provided
    handler: handleLogout,
  });

  // Account Linking Route
  fastify.post('/link-provider', {
    schema: {
      description: 'Confirm account linking (link new OAuth provider to existing account)',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['linkingToken', 'confirm'],
        properties: {
          linkingToken: {
            type: 'string',
            description: 'Temporary linking token returned during OAuth callback',
          },
          confirm: {
            type: 'boolean',
            description: 'User confirmation to proceed with linking',
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
                    role: { type: 'string' },
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
    handler: handleLinkProvider,
  });

  // Mobile OAuth Routes
  fastify.post('/google/mobile', {
    schema: {
      description: 'Handle Google OAuth for mobile apps (legacy code flow)',
      tags: ['auth', 'mobile'],
      body: {
        type: 'object',
        required: ['code', 'redirectUri'],
        properties: {
          code: {
            type: 'string',
            description: 'Authorization code received from Google OAuth redirect',
          },
          redirectUri: {
            type: 'string',
            description: 'Redirect URI used to obtain the authorization code (must match)',
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

  fastify.post('/google/id-token', {
    schema: {
      description: 'Handle Google OAuth for mobile apps with ID token (native SDK)',
      tags: ['auth', 'mobile'],
      body: {
        type: 'object',
        required: ['idToken'],
        properties: {
          idToken: {
            type: 'string',
            description: 'ID token from Google Sign-In SDK',
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
    handler: handleGoogleIdTokenAuth,
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

  // Session Management Routes (Protected)
  fastify.get('/sessions', {
    schema: {
      description: 'Get active sessions for current user',
      tags: ['auth', 'sessions'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                sessions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      familyId: { type: 'string' },
                      createdAt: { type: 'string' },
                      expiresAt: { type: 'string' },
                      ipAddress: { type: 'string', nullable: true },
                      userAgent: { type: 'string', nullable: true },
                      isUsed: { type: 'boolean' },
                      usedAt: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: handleGetSessions,
  });

  fastify.delete('/sessions/:id', {
    schema: {
      description: 'Revoke a specific session',
      tags: ['auth', 'sessions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
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
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: handleRevokeSession,
  });
}
