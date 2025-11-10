/**
 * Authorized Admins Management Routes
 *
 * Routes for managing pre-authorized admin emails
 * SUPERADMIN ONLY - Only superadmins can manage authorized admins
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db/client';
import { authorizedAdmins, users } from '@/db/schema';
import type { JWTPayload } from '@/modules/auth/auth.types';
import { requireSuperadmin } from '@/middleware/authorize';

/**
 * List all authorized admin emails
 * GET /api/admin/authorized-admins
 */
async function listAuthorizedAdmins(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // Fetch all authorized admins with creator info
    const result = await db
      .select({
        id: authorizedAdmins.id,
        email: authorizedAdmins.email,
        createdAt: authorizedAdmins.createdAt,
        createdBy: authorizedAdmins.createdBy,
        createdByEmail: users.email,
        createdByName: users.name,
      })
      .from(authorizedAdmins)
      .leftJoin(users, eq(authorizedAdmins.createdBy, users.id))
      .orderBy(desc(authorizedAdmins.createdAt));

    return reply.send({
      success: true,
      authorizedAdmins: result,
      total: result.length,
    });
  } catch (error) {
    _request.log.error({ error }, 'Failed to list authorized admins');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list authorized admins',
      },
    });
  }
}

/**
 * Add email to authorized admins
 * POST /api/admin/authorized-admins
 */
async function addAuthorizedAdmin(
  request: FastifyRequest<{
    Body: {
      email: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { email } = request.body;
    const user = request.user as JWTPayload;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
        },
      });
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const [existing] = await db
      .select()
      .from(authorizedAdmins)
      .where(eq(authorizedAdmins.email, normalizedEmail))
      .limit(1);

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_AUTHORIZED',
          message: 'This email is already in the authorized list',
        },
      });
    }

    // Add to authorized admins
    const [newAuthorizedAdmin] = await db
      .insert(authorizedAdmins)
      .values({
        email: normalizedEmail,
        createdBy: user.id,
      })
      .returning();

    request.log.info({ email: normalizedEmail, createdBy: user.id }, 'Added authorized admin');

    return reply.status(201).send({
      success: true,
      authorizedAdmin: newAuthorizedAdmin,
      message: 'Email added to authorized admins. Users with this email will be auto-promoted to admin on sign-in.',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to add authorized admin');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add authorized admin',
      },
    });
  }
}

/**
 * Remove email from authorized admins
 * DELETE /api/admin/authorized-admins/:id
 */
async function removeAuthorizedAdmin(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;
    const user = request.user as JWTPayload;

    // Validate ID
    const authorizedAdminId = parseInt(id, 10);
    if (isNaN(authorizedAdminId)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid authorized admin ID',
        },
      });
    }

    // Check if authorized admin exists
    const [existing] = await db
      .select()
      .from(authorizedAdmins)
      .where(eq(authorizedAdmins.id, authorizedAdminId))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Authorized admin not found',
        },
      });
    }

    // Delete authorized admin
    await db.delete(authorizedAdmins).where(eq(authorizedAdmins.id, authorizedAdminId));

    request.log.info(
      { email: existing.email, removedBy: user.id },
      'Removed authorized admin',
    );

    return reply.send({
      success: true,
      message: 'Email removed from authorized admins',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to remove authorized admin');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove authorized admin',
      },
    });
  }
}

/**
 * Register all authorized admin routes
 */
export async function authorizedAdminsRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require superadmin role
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', requireSuperadmin);

  // GET /api/admin/authorized-admins - List all
  fastify.get('/', {
    schema: {
      tags: ['admin', 'authorized-admins'],
      summary: 'List all authorized admin emails',
      description: 'Returns all pre-authorized admin emails. Superadmin only.',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            authorizedAdmins: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  email: { type: 'string' },
                  createdAt: { type: 'string' },
                  createdBy: { type: 'number' },
                  createdByEmail: { type: 'string', nullable: true },
                  createdByName: { type: 'string', nullable: true },
                },
              },
            },
            total: { type: 'number' },
          },
        },
      },
    },
    handler: listAuthorizedAdmins,
  });

  // POST /api/admin/authorized-admins - Add email
  fastify.post('/', {
    schema: {
      tags: ['admin', 'authorized-admins'],
      summary: 'Add email to authorized admins',
      description: 'Pre-authorize an email for auto-promotion to admin. Superadmin only.',
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            authorizedAdmin: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                createdAt: { type: 'string' },
                createdBy: { type: 'number' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: addAuthorizedAdmin,
  });

  // DELETE /api/admin/authorized-admins/:id - Remove email
  fastify.delete('/:id', {
    schema: {
      tags: ['admin', 'authorized-admins'],
      summary: 'Remove email from authorized admins',
      description: 'Remove an email from the authorized admins list. Superadmin only.',
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
            message: { type: 'string' },
          },
        },
      },
    },
    handler: removeAuthorizedAdmin,
  });
}
