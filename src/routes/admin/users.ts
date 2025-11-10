/**
 * Admin User Management Routes
 *
 * Protected routes for admins to manage users
 * Requires admin or superadmin role
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, asc, like, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/users';
import type { JWTPayload } from '@/modules/auth/auth.types';
import { requireAdmin } from '@/middleware/authorize';

/**
 * List all users with pagination and search
 * GET /api/admin/users?page=1&limit=20&search=email
 */
async function listUsers(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: 'createdAt' | 'email' | 'lastLoginAt';
      sortOrder?: 'asc' | 'desc';
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = request.query;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = search
      ? or(like(users.email, `%${search}%`), like(users.name, `%${search}%`))
      : undefined;

    // Build order by clause
    const orderByClause = sortOrder === 'asc' ? asc(users[sortBy]) : desc(users[sortBy]);

    // Fetch users
    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(users)
      .where(whereClause);

    const count = countResult[0]?.count || 0;
    const totalPages = Math.ceil(count / limit);

    return reply.send({
      success: true,
      users: userList,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list users');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list users',
      },
    });
  }
}

/**
 * Get user by ID
 * GET /api/admin/users/:id
 */
async function getUser(
  request: FastifyRequest<{
    Params: { id: number };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return reply.send({
      success: true,
      user,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get user');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user',
      },
    });
  }
}

/**
 * Update user role
 * PATCH /api/admin/users/:id/role
 * Body: { role: 'user' | 'admin' | 'superadmin' }
 */
async function updateUserRole(
  request: FastifyRequest<{
    Params: { id: number };
    Body: { role: 'user' | 'admin' | 'superadmin' };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;
    const { role } = request.body;
    const currentUser = request.user as JWTPayload;

    // Validate role
    /* v8 ignore next 7 - Unreachable: Fastify schema validation catches this */
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'Invalid role. Must be one of: user, admin, superadmin',
        },
      });
    }

    // Prevent demoting yourself
    if (id === currentUser.id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANNOT_MODIFY_SELF',
          message: 'You cannot change your own role',
        },
      });
    }

    // Only superadmin can promote to superadmin
    if (role === 'superadmin' && currentUser.role !== 'superadmin') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only superadmins can promote users to superadmin',
        },
      });
    }

    // Update user role
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    request.log.info({ userId: id, oldRole: currentUser.role, newRole: role }, 'User role updated');

    return reply.send({
      success: true,
      user: updatedUser,
      message: `User role updated to ${role}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update user role');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user role',
      },
    });
  }
}

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
async function deleteUser(
  request: FastifyRequest<{
    Params: { id: number };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;
    const currentUser = request.user as JWTPayload;

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'You cannot delete your own account',
        },
      });
    }

    // Fetch user to check role
    const [userToDelete] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!userToDelete) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Only superadmin can delete other superadmins
    if (userToDelete.role === 'superadmin' && currentUser.role !== 'superadmin') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only superadmins can delete other superadmins',
        },
      });
    }

    // Delete user
    await db.delete(users).where(eq(users.id, id));

    request.log.info({ userId: id }, 'User deleted by admin');

    return reply.send({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete user');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete user',
      },
    });
  }
}

/**
 * Get user statistics
 * GET /api/admin/users/stats
 */
async function getUserStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Get total users count
    const totalResult = await db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(users);

    const total = totalResult[0]?.total || 0;

    // Get users by role
    const roleStats = await db
      .select({
        role: users.role,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(users)
      .groupBy(users.role);

    // Get users by provider (from provider_accounts table)
    const providerStats = await db
      .select({
        provider: sql<string>`provider_accounts.provider`,
        count: sql<number>`cast(count(DISTINCT users.id) as integer)`,
      })
      .from(users)
      .leftJoin(sql`provider_accounts`, sql`provider_accounts.user_id = users.id`)
      .groupBy(sql`provider_accounts.provider`);

    // Convert arrays to objects for frontend consumption
    const byRole: Record<string, number> = {};
    for (const stat of roleStats) {
      byRole[stat.role] = stat.count;
    }

    const byProvider: Record<string, number> = {};
    for (const stat of providerStats) {
      byProvider[stat.provider] = stat.count;
    }

    return reply.send({
      success: true,
      stats: {
        total,
        byRole,
        byProvider,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get user stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user statistics',
      },
    });
  }
}

/**
 * Register admin user routes
 */
export default async function adminUserRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication first, then admin authorization
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', requireAdmin);

  fastify.get('/', {
    schema: {
      description: 'List all users with pagination',
      tags: ['admin', 'users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          sortBy: {
            type: 'string',
            enum: ['createdAt', 'email', 'lastLoginAt'],
            default: 'createdAt',
          },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  email: { type: 'string' },
                  name: { type: 'string', nullable: true },
                  avatar: { type: 'string', nullable: true },
                  role: { type: 'string', enum: ['user', 'coach', 'admin', 'superadmin'] },
                  createdAt: { type: 'string' },
                  lastLoginAt: { type: 'string', nullable: true },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: listUsers,
  });

  fastify.get('/stats', {
    schema: {
      description: 'Get user statistics',
      tags: ['admin', 'users'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            stats: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                byRole: { type: 'object', additionalProperties: { type: 'number' } },
                byProvider: { type: 'object', additionalProperties: { type: 'number' } },
              },
            },
          },
        },
      },
    },
    handler: getUserStats,
  });

  fastify.get('/:id', {
    schema: {
      description: 'Get user by ID',
      tags: ['admin', 'users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string', nullable: true },
                avatar: { type: 'string', nullable: true },
                role: { type: 'string', enum: ['user', 'coach', 'admin', 'superadmin'] },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                lastLoginAt: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
    handler: getUser,
  });

  fastify.patch('/:id/role', {
    schema: {
      description: 'Update user role',
      tags: ['admin', 'users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' },
        },
      },
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string', nullable: true },
                role: { type: 'string', enum: ['user', 'coach', 'admin', 'superadmin'] },
                updatedAt: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: updateUserRole,
  });

  fastify.delete('/:id', {
    schema: {
      description: 'Delete user',
      tags: ['admin', 'users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' },
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
    handler: deleteUser,
  });
}
