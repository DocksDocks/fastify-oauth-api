/**
 * Setup Service
 *
 * Handles first-time setup logic:
 * - Check setup completion status
 * - Initialize setup (create API keys, upgrade user, mark complete)
 * - Reset setup for development
 */

import { db } from '@/db/client';
import { setupStatus, users, apiKeys, authorizedAdmins, providerAccounts } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logger } from '@/utils/logger';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if setup is complete
 */
export async function checkSetupStatus(): Promise<{
  setupComplete: boolean;
  hasUsers: boolean;
  hasApiKeys: boolean;
}> {
  try {
    // Check if users exist
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const hasUsers = Number(userCount[0]?.count) > 0;

    // Check if API keys exist
    const apiKeyCount = await db.select({ count: sql<number>`count(*)` }).from(apiKeys);
    const hasApiKeys = Number(apiKeyCount[0]?.count) > 0;

    // Setup is complete when BOTH users and API keys exist (real system state)
    // This is more reliable than checking setup_status table which can get out of sync
    return {
      setupComplete: hasUsers && hasApiKeys,
      hasUsers,
      hasApiKeys,
    };
  } catch (error) {
    logger.error(error, 'Failed to check setup status');
    throw error;
  }
}

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  return `ak_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Hash API key using bcrypt
 */
async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 10);
}

/**
 * Initialize setup after first OAuth login
 */
export async function initializeSetup(userId: number): Promise<{
  iosApiKey: string;
  androidApiKey: string;
  webApiKey: string;
}> {
  try {
    // Block setup in production if already complete
    if (process.env.NODE_ENV === 'production') {
      const currentStatus = await checkSetupStatus();
      if (currentStatus.setupComplete) {
        throw new Error('Setup cannot be re-run in production environment');
      }
    }

    // Generate API keys (mobile apps + website)
    const iosApiKey = generateApiKey();
    const androidApiKey = generateApiKey();
    const webApiKey = generateApiKey();

    logger.info({ userId }, 'Initializing first-time setup');

    // Use transaction to ensure atomicity and prevent race conditions
    await db.transaction(async (tx) => {
      // Check if users and API keys already exist (idempotent setup check)
      const userCount = await tx.select({ count: sql<number>`count(*)` }).from(users);
      const hasUsers = Number(userCount[0]?.count) > 0;

      const apiKeyCount = await tx.select({ count: sql<number>`count(*)` }).from(apiKeys);
      const hasApiKeys = Number(apiKeyCount[0]?.count) > 0;

      // If setup is already complete (users + API keys exist), prevent re-initialization
      if (hasUsers && hasApiKeys) {
        throw new Error('Setup is already complete');
      }

      // 1. Add user to authorized_admins (user already created as superadmin)
      // Use onConflictDoNothing to make this idempotent (skip if email already exists)
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      await tx.insert(authorizedAdmins).values({
        email: user!.email,
        createdBy: userId, // Created by the first superadmin user
      }).onConflictDoNothing();

      // 2. Create API keys (mobile apps + website)
      await tx.insert(apiKeys).values([
        {
          name: 'ios_api_key',
          keyHash: await hashApiKey(iosApiKey),
          createdBy: userId,
        },
        {
          name: 'android_api_key',
          keyHash: await hashApiKey(androidApiKey),
          createdBy: userId,
        },
        {
          name: 'web_api_key',
          keyHash: await hashApiKey(webApiKey),
          createdBy: userId,
        },
      ]);

      // 4. Mark setup as complete in setup_status table (for audit purposes)
      // Use INSERT with onConflictDoUpdate to handle missing row gracefully
      await tx
        .insert(setupStatus)
        .values({
          id: 1,
          isSetupComplete: true,
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: setupStatus.id,
          set: {
            isSetupComplete: true,
            completedAt: new Date(),
          },
        });
    });

    logger.info({ userId }, 'Setup completed successfully');

    return {
      iosApiKey,
      androidApiKey,
      webApiKey,
    };
  } catch (error) {
    logger.error(error, 'Failed to initialize setup');
    throw error;
  }
}

/**
 * Reset setup for development (full reset - clear all data + run migrations)
 */
export async function resetSetup(): Promise<void> {
  try {
    // SECURITY FIX: Block reset in production environment
    if (process.env.NODE_ENV === 'production') {
      logger.error('Attempted to reset setup in production environment - BLOCKED');
      throw new Error('Setup reset is not allowed in production environment');
    }

    logger.warn('Resetting setup - clearing all data and running migrations');

    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // 1. Truncate all tables (order matters due to foreign keys)
      await tx.execute(sql`TRUNCATE TABLE ${users}, ${providerAccounts}, ${apiKeys}, ${authorizedAdmins} RESTART IDENTITY CASCADE`);

      // 2. Reset setup_status
      await tx.update(setupStatus).set({
        isSetupComplete: false,
        completedAt: null,
      });
    });

    logger.info('Data cleared, running migrations...');

    // 3. Run migrations to ensure schema is up-to-date
    // Path: src/services/setup.service.ts -> src/db/migrations
    const migrationsFolder = path.resolve(__dirname, '../db/migrations');
    logger.info({ migrationsFolder }, 'Running migrations from folder');
    await migrate(db, { migrationsFolder });

    logger.info('Setup reset completed with migrations');
  } catch (error) {
    logger.error(error, 'Failed to reset setup');
    throw error;
  }
}
