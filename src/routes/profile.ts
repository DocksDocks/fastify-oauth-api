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
import {
  getOrCreateUserPreferences,
  updateUserPreferences,
} from '@/services/user-preferences.service';
import type { NewUserPreferences } from '@/db/schema';

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

    // Get or create user preferences
    const preferences = await getOrCreateUserPreferences(user.id);

    return reply.send({
      success: true,
      user: userRecord,
      preferences,
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
 * Body: { name?, avatar?, locale?, theme?, timezone?, currency?, dateFormat?, timeFormat?, emailNotifications?, pushNotifications?, marketingEmails?, compactMode?, showAvatars? }
 */
async function updateProfile(
  request: FastifyRequest<{
    Body: {
      // User fields
      name?: string;
      avatar?: string;
      // Preference fields
      locale?: string;
      theme?: 'light' | 'dark' | 'system';
      timezone?: 'UTC' | 'America/New_York' | 'America/Chicago' | 'America/Denver' | 'America/Los_Angeles' | 'America/Sao_Paulo' | 'Europe/London' | 'Europe/Paris' | 'Europe/Berlin' | 'Asia/Tokyo' | 'Asia/Shanghai' | 'Asia/Dubai' | 'Australia/Sydney';
      currency?: 'USD' | 'EUR' | 'GBP' | 'BRL' | 'JPY' | 'CNY' | 'AUD' | 'CAD' | 'CHF' | 'INR';
      dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD.MM.YYYY' | 'DD-MM-YYYY';
      timeFormat?: '12h' | '24h';
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      marketingEmails?: boolean;
      compactMode?: boolean;
      showAvatars?: boolean;
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
      'primaryProviderAccountId',
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

    const { name, avatar, locale, theme, timezone, currency, dateFormat, timeFormat, emailNotifications, pushNotifications, marketingEmails, compactMode, showAvatars } = body;

    // Separate user fields from preference fields
    const userUpdates: { name?: string; avatar?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    const preferenceUpdates: Partial<Omit<NewUserPreferences, 'userId' | 'id' | 'createdAt' | 'updatedAt'>> = {};

    // User fields
    if (name !== undefined) {
      userUpdates.name = name;
    }
    if (avatar !== undefined) {
      userUpdates.avatar = avatar;
    }

    // Preference fields
    if (locale !== undefined) preferenceUpdates.locale = locale;
    if (theme !== undefined) preferenceUpdates.theme = theme;
    if (timezone !== undefined) preferenceUpdates.timezone = timezone;
    if (currency !== undefined) preferenceUpdates.currency = currency;
    if (dateFormat !== undefined) preferenceUpdates.dateFormat = dateFormat;
    if (timeFormat !== undefined) preferenceUpdates.timeFormat = timeFormat;
    if (emailNotifications !== undefined) preferenceUpdates.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) preferenceUpdates.pushNotifications = pushNotifications;
    if (marketingEmails !== undefined) preferenceUpdates.marketingEmails = marketingEmails;
    if (compactMode !== undefined) preferenceUpdates.compactMode = compactMode;
    if (showAvatars !== undefined) preferenceUpdates.showAvatars = showAvatars;

    // Validate at least one editable field provided
    if (Object.keys(userUpdates).length === 1 && Object.keys(preferenceUpdates).length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'At least one field is required',
      });
    }

    let updatedUser = null;

    // Update user fields if any
    if (Object.keys(userUpdates).length > 1) {
      const [result] = await db
        .update(users)
        .set(userUpdates)
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          avatar: users.avatar,
          role: users.role,
          updatedAt: users.updatedAt,
        });

      updatedUser = result;

      if (!updatedUser) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        });
      }
    }

    // Update preferences if any
    let updatedPreferences = null;
    if (Object.keys(preferenceUpdates).length > 0) {
      updatedPreferences = await updateUserPreferences(user.id, preferenceUpdates);
    }

    // If no user updates, fetch current user
    if (!updatedUser) {
      const [currentUser] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          avatar: users.avatar,
          role: users.role,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      updatedUser = currentUser;
    }

    // Get current preferences if not updated
    if (!updatedPreferences) {
      updatedPreferences = await getOrCreateUserPreferences(user.id);
    }

    return reply.send({
      success: true,
      user: updatedUser,
      preferences: updatedPreferences,
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
      providers,
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
      remainingProviders,
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
            user: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                name: { type: 'string', nullable: true },
                avatar: { type: 'string', nullable: true },
                role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
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
          locale: { type: 'string', enum: ['pt-BR', 'en'] },
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
                role: { type: 'string' },
                locale: { type: 'string', nullable: true },
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
            providers: {
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
    handler: unlinkProvider,
  });
}
