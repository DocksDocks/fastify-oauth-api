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

/**
 * Check if setup is complete
 */
export async function checkSetupStatus(): Promise<{
  setupComplete: boolean;
  hasUsers: boolean;
  hasApiKeys: boolean;
}> {
  try {
    // Check setup_status table
    const [status] = await db.select().from(setupStatus).limit(1);

    // Check if users exist
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const hasUsers = Number(userCount[0]?.count) > 0;

    // Check if API keys exist
    const apiKeyCount = await db.select({ count: sql<number>`count(*)` }).from(apiKeys);
    const hasApiKeys = Number(apiKeyCount[0]?.count) > 0;

    return {
      setupComplete: status?.isSetupComplete ?? false,
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
    // Generate API keys (mobile apps + website)
    const iosApiKey = generateApiKey();
    const androidApiKey = generateApiKey();
    const webApiKey = generateApiKey();

    logger.info({ userId }, 'Initializing first-time setup');

    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // 1. Add user to authorized_admins (user already created as superadmin)
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      await tx.insert(authorizedAdmins).values({
        email: user!.email,
        createdBy: userId, // Created by the first superadmin user
      });

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

      // 4. Mark setup as complete
      await tx
        .update(setupStatus)
        .set({
          isSetupComplete: true,
          completedAt: new Date(),
        })
        .where(eq(setupStatus.id, 1)); // Assuming id=1 for setup status
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
 * Reset setup for development (full reset - clear all data)
 */
export async function resetSetup(): Promise<void> {
  try {
    logger.warn('Resetting setup - clearing all data');

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

    logger.info('Setup reset completed');
  } catch (error) {
    logger.error(error, 'Failed to reset setup');
    throw error;
  }
}
