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
import type { JWTPayload } from '@/modules/auth/auth.types';

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
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const user = request.user as JWTPayload;
    const { name, avatar } = request.body;

    // Validate at least one field provided
    if (!name && !avatar) {
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
}
