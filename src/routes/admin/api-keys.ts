/**
 * API Keys Management Routes
 *
 * Protected routes for admins to manage global API keys
 * Supports 1 active key per platform (iOS/Android/Admin Panel)
 * Automatically refreshes Redis cache after CRUD operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, isNull, desc } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/db/client';
import { apiKeys } from '@/db/schema/api-keys';
import type { JWTPayload } from '@/modules/auth/auth.types';
import { requireAdmin } from '@/middleware/authorize';
import { refreshApiKeyCache } from '@/services/api-key-cache.service';

/**
 * Generate a secure random API key
 * Format: 64 character hex string (256 bits of entropy)
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash API key using bcrypt
 * Uses cost factor of 10 (recommended for production)
 */
async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

/**
 * List all API keys
 * GET /api/admin/api-keys
 */
async function listApiKeys(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
        revokedAt: apiKeys.revokedAt,
        createdBy: apiKeys.createdBy,
      })
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));

    return reply.send({
      success: true,
      data: {
        keys: keys.map((key) => ({
          ...key,
          status: key.revokedAt ? 'revoked' : 'active',
        })),
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list API keys');
    return reply.status(500).send({
      success: false,
      error: 'Failed to list API keys',
    });
  }
}

/**
 * Generate new API key for a specific platform
 * POST /api/admin/api-keys/generate
 * Body: { platform: 'ios' | 'android' | 'admin_panel' }
 * Note: Only 1 active key per platform is allowed
 */
async function generateNewApiKey(
  request: FastifyRequest<{
    Body: { platform: string };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { platform } = request.body;
    const currentUser = request.user as JWTPayload;

    // Validate platform
    const validPlatforms = ['ios', 'android', 'admin_panel'];
    if (!validPlatforms.includes(platform)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
      });
    }

    // Generate key name
    const keyName = `${platform}_api_key`;

    // Check if key already exists (and is not revoked)
    const existingKey = await db
      .select({ id: apiKeys.id, revokedAt: apiKeys.revokedAt })
      .from(apiKeys)
      .where(eq(apiKeys.name, keyName))
      .limit(1);

    if (existingKey.length > 0 && !existingKey[0].revokedAt) {
      return reply.status(409).send({
        success: false,
        error: `API key for platform '${platform}' already exists. Use regenerate to create a new one, or revoke it first.`,
      });
    }

    // Generate new API key
    const plainKey = generateApiKey();
    const keyHash = await hashApiKey(plainKey);

    // Store hashed key in database
    const [newKey] = await db
      .insert(apiKeys)
      .values({
        name: keyName,
        keyHash,
        createdBy: currentUser.id,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        createdAt: apiKeys.createdAt,
      });

    // Refresh Redis cache
    await refreshApiKeyCache();

    request.log.info({ apiKeyId: newKey.id, name: newKey.name }, 'API key generated');

    // Return plain key (ONLY TIME IT'S VISIBLE!)
    return reply.send({
      success: true,
      data: {
        key: newKey,
        plainKey, // WARNING: Store this securely! It won't be shown again.
      },
      message: 'API key generated successfully. Store it securely - it will not be shown again.',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to generate API key');
    return reply.status(500).send({
      success: false,
      error: 'Failed to generate API key',
    });
  }
}

/**
 * Regenerate existing API key
 * POST /api/admin/api-keys/:id/regenerate
 */
async function regenerateApiKey(
  request: FastifyRequest<{
    Params: { id: number };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;
    const currentUser = request.user as JWTPayload;

    // Check if key exists
    const existingKey = await db
      .select({ id: apiKeys.id, name: apiKeys.name, revokedAt: apiKeys.revokedAt })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (existingKey.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'API key not found',
      });
    }

    if (existingKey[0].revokedAt) {
      return reply.status(400).send({
        success: false,
        error: 'Cannot regenerate revoked key. Create a new one instead.',
      });
    }

    // Generate new key
    const plainKey = generateApiKey();
    const keyHash = await hashApiKey(plainKey);

    // Update key in database
    const [updatedKey] = await db
      .update(apiKeys)
      .set({
        keyHash,
        updatedAt: new Date(),
        createdBy: currentUser.id, // Track who regenerated
      })
      .where(eq(apiKeys.id, id))
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        updatedAt: apiKeys.updatedAt,
      });

    // Refresh Redis cache
    await refreshApiKeyCache();

    request.log.info({ apiKeyId: id, name: existingKey[0].name }, 'API key regenerated');

    // Return new plain key (ONLY TIME IT'S VISIBLE!)
    return reply.send({
      success: true,
      data: {
        key: updatedKey,
        plainKey, // WARNING: Store this securely! It won't be shown again.
      },
      message: 'API key regenerated successfully. Update your apps with the new key.',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to regenerate API key');
    return reply.status(500).send({
      success: false,
      error: 'Failed to regenerate API key',
    });
  }
}

/**
 * Revoke API key
 * POST /api/admin/api-keys/:id/revoke
 */
async function revokeApiKey(
  request: FastifyRequest<{
    Params: { id: number };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;

    // Check if key exists
    const existingKey = await db
      .select({ id: apiKeys.id, name: apiKeys.name, revokedAt: apiKeys.revokedAt })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (existingKey.length === 0) {
      return reply.status(404).send({
        success: false,
        error: 'API key not found',
      });
    }

    if (existingKey[0].revokedAt) {
      return reply.status(400).send({
        success: false,
        error: 'API key is already revoked',
      });
    }

    // Revoke key
    await db
      .update(apiKeys)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id));

    // Refresh Redis cache
    await refreshApiKeyCache();

    request.log.info({ apiKeyId: id, name: existingKey[0].name }, 'API key revoked');

    return reply.send({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to revoke API key');
    return reply.status(500).send({
      success: false,
      error: 'Failed to revoke API key',
    });
  }
}

/**
 * Get API key statistics
 * GET /api/admin/api-keys/stats
 */
async function getApiKeyStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const allKeys = await db.select({ revokedAt: apiKeys.revokedAt }).from(apiKeys);

    const total = allKeys.length;
    const active = allKeys.filter((k) => !k.revokedAt).length;
    const revoked = allKeys.filter((k) => k.revokedAt).length;

    return reply.send({
      success: true,
      data: {
        total,
        active,
        revoked,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get API key stats');
    return reply.status(500).send({
      success: false,
      error: 'Failed to get API key statistics',
    });
  }
}

/**
 * Register API key management routes
 */
export default async function apiKeyRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication + admin role
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('onRequest', requireAdmin);

  // List all API keys
  fastify.get('/', {
    schema: {
      description: 'List all API keys',
      tags: ['admin', 'api-keys'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                keys: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      status: { type: 'string', enum: ['active', 'revoked'] },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                      revokedAt: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: listApiKeys,
  });

  // Get API key statistics
  fastify.get('/stats', {
    schema: {
      description: 'Get API key statistics',
      tags: ['admin', 'api-keys'],
      security: [{ bearerAuth: [] }],
    },
    handler: getApiKeyStats,
  });

  // Generate new API key
  fastify.post('/generate', {
    schema: {
      description: 'Generate new API key (1 active key per platform)',
      tags: ['admin', 'api-keys'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['platform'],
        properties: {
          platform: {
            type: 'string',
            enum: ['ios', 'android', 'admin_panel'],
            description: 'Platform for the API key (only 1 active key allowed per platform)',
          },
        },
      },
    },
    handler: generateNewApiKey,
  });

  // Regenerate existing API key
  fastify.post('/:id/regenerate', {
    schema: {
      description: 'Regenerate existing API key',
      tags: ['admin', 'api-keys'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' },
        },
      },
    },
    handler: regenerateApiKey,
  });

  // Revoke API key
  fastify.post('/:id/revoke', {
    schema: {
      description: 'Revoke API key',
      tags: ['admin', 'api-keys'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'number' },
        },
      },
    },
    handler: revokeApiKey,
  });
}
