/**
 * Setup Authentication Service
 *
 * Handles OAuth authentication during first-time setup
 * Separate from normal auth to keep setup logic isolated
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, type User, providerAccounts } from '@/db/schema';
import type { OAuthProfile, OAuthProvider } from '@/modules/auth/auth.types';
import { createDefaultPreferences } from '@/services/user-preferences.service';
import { logger } from '@/utils/logger';

/**
 * Handle OAuth callback for first-time setup
 * Creates the first user without requiring them to be in authorized_admins table
 * Used only during initial setup when no users exist
 *
 * @param profile - OAuth profile from Google/Apple
 * @returns Created or existing user
 */
export async function handleSetupOAuthCallback(profile: OAuthProfile): Promise<User> {
  const { email, provider, name, avatar, providerId } = profile;

  logger.info({ email, provider }, 'Handling setup OAuth callback');

  // Check if user already exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existingUser) {
    // User exists, update last login and return
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, existingUser.id));
    logger.info({ userId: existingUser.id }, 'Existing user found during setup');
    return existingUser;
  }

  // Create first user as superadmin
  const user = await db.transaction(async (tx) => {
    // Step 1: Create user without primaryProviderAccountId
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name: name || null,
        avatar: avatar || null,
        role: 'superadmin', // First user created during setup is superadmin
        lastLoginAt: new Date(),
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user during setup');
    }

    // Step 2: Create provider account
    const [providerAccount] = await tx
      .insert(providerAccounts)
      .values({
        userId: newUser.id,
        provider: provider as OAuthProvider,
        providerId,
        email,
        name: name || null,
        avatar: avatar || null,
      })
      .returning();

    if (!providerAccount) {
      throw new Error('Failed to create provider account during setup');
    }

    // Step 3: Set primaryProviderAccountId
    await tx
      .update(users)
      .set({ primaryProviderAccountId: providerAccount.id })
      .where(eq(users.id, newUser.id));

    // Step 4: Create default user preferences (pass transaction)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await createDefaultPreferences(newUser.id, 'pt-BR', tx as any);

    logger.info({ userId: newUser.id, email }, 'Created first user during setup');

    return newUser;
  });

  return user;
}
