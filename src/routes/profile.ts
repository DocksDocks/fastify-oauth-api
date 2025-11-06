/**
 * User Profile Routes
 *
 * Protected routes for authenticated users to manage their profile
 * Requires valid JWT token in Authorization header
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/users';
import type { JWTPayload, OAuthProvider } from '@/modules/auth/auth.types';
import {
  getUserProviderAccounts,
  deleteProviderAccount,
} from '@/modules/auth/provider-accounts.service';

// Extend FastifyInstance to include authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Get current user profile
 * GET /api/profile
 */
async function getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const user = request.user as JWTPayload;

    // Fetch fresh user data from database
    const [userRecord] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
        provider: users.provider,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userRecord) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: userRecord,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to fetch profile');
    return reply.status(500).send({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
}

/**
 * Update user profile
 * PATCH /api/profile
 * Body: { name?, avatar? }
 */
async function updateProfile(
  request: FastifyRequest<{
    Body: {
      name?: string;
      avatar?: string;
      [key: string]: unknown; // Allow additional fields for validation
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const user = request.user as JWTPayload;
    const body = request.body;

    // Define locked fields that cannot be edited
    const lockedFields = [
      'id',
      'email',
      'role',
      'provider',
      'providerId',
      'primaryProvider',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
    ];

    // Check if any locked fields are in the request
    const attemptedLockedFields = lockedFields.filter((field) => field in body);
    if (attemptedLockedFields.length > 0) {
      return reply.status(403).send({
        success: false,
        error: `Cannot update locked fields: ${attemptedLockedFields.join(', ')}`,
      });
    }

    const { name, avatar } = body;

    // Validate at least one editable field provided
    if (name === undefined && avatar === undefined) {
      return reply.status(400).send({
        success: false,
        error: 'At least one field (name or avatar) is required',
      });
    }

    // Prepare update data
    const updates: { name?: string; avatar?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updates.name = name;
    }
    if (avatar !== undefined) {
      updates.avatar = avatar;
    }

    // Update user in database
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return reply.status(404).send({
        success: false,
        error: 'User not found',
      });
    }

    return reply.send({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update profile');
    return reply.status(500).send({
      success: false,
      error: 'Failed to update profile',
    });
  }
}

/**
 * Delete user account
 * DELETE /api/profile
 */
async function deleteProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const user = request.user as JWTPayload;

    // Delete user from database
    await db.delete(users).where(eq(users.id, user.id));

    return reply.send({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete profile');
    return reply.status(500).send({
      success: false,
      error: 'Failed to delete account',
    });
  }
}

/**
 * Get all linked OAuth providers for the current user
 * GET /api/profile/providers
 */
async function getProviders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const user = request.user as JWTPayload;

    const providers = await getUserProviderAccounts(user.id);

    return reply.send({
      success: true,
      data: providers,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to fetch providers');
    return reply.status(500).send({
      success: false,
      error: 'Failed to fetch linked providers',
    });
  }
}

/**
 * Unlink an OAuth provider from the current user
 * DELETE /api/profile/providers/:provider
 */
async function unlinkProvider(
  request: FastifyRequest<{
    Params: {
      provider: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const user = request.user as JWTPayload;
    const { provider } = request.params;

    // Validate provider
    if (!['google', 'apple'].includes(provider)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid provider. Must be "google" or "apple"',
      });
    }

    // Unlink provider
    await deleteProviderAccount(user.id, provider as OAuthProvider);

    // Get remaining providers
    const remainingProviders = await getUserProviderAccounts(user.id);

    return reply.send({
      success: true,
      message: `${provider} provider unlinked successfully`,
      data: {
        remainingProviders,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to unlink provider');
    const err = error as Error;
    return reply.status(400).send({
      success: false,
      error: err.message || 'Failed to unlink provider',
    });
  }
}

/**
 * Register profile routes
 */
export default async function profileRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', {
    schema: {
      description: 'Get current user profile',
      tags: ['profile'],
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
                name: { type: 'string', nullable: true },
                avatar: { type: 'string', nullable: true },
                role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
                provider: { type: 'string', enum: ['google', 'apple'] },
                createdAt: { type: 'string' },
                lastLoginAt: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
    handler: getProfile,
  });

  fastify.patch('/', {
    schema: {
      description: 'Update user profile',
      tags: ['profile'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          avatar: { type: 'string', format: 'uri' },
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
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string', nullable: true },
                avatar: { type: 'string', nullable: true },
                role: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: updateProfile,
  });

  fastify.delete('/', {
    schema: {
      description: 'Delete user account',
      tags: ['profile'],
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
    handler: deleteProfile,
  });

  // Provider management routes
  fastify.get('/providers', {
    schema: {
      description: 'Get all linked OAuth providers',
      tags: ['profile', 'providers'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  provider: { type: 'string' },
                  providerId: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string', nullable: true },
                  avatar: { type: 'string', nullable: true },
                  linkedAt: { type: 'string' },
                  isPrimary: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    handler: getProviders,
  });

  fastify.delete('/providers/:provider', {
    schema: {
      description: 'Unlink an OAuth provider',
      tags: ['profile', 'providers'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: {
            type: 'string',
            enum: ['google', 'apple'],
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                remainingProviders: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      provider: { type: 'string' },
                      providerId: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string', nullable: true },
                      avatar: { type: 'string', nullable: true },
                      linkedAt: { type: 'string' },
                      isPrimary: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: unlinkProvider,
  });
}
