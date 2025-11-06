/**
 * Provider Accounts Service
 * Manages OAuth provider accounts linked to users (for multi-provider support)
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { providerAccounts, users, type ProviderAccount, type NewProviderAccount } from '@/db/schema';
import type { OAuthProvider, ProviderAccountInfo } from './auth.types';
import { UnauthorizedError } from '@/utils/errors';

/**
 * Find provider account by provider and providerId
 */
export async function getProviderAccount(
  provider: OAuthProvider,
  providerId: string
): Promise<ProviderAccount | null> {
  const [account] = await db
    .select()
    .from(providerAccounts)
    .where(and(eq(providerAccounts.provider, provider), eq(providerAccounts.providerId, providerId)))
    .limit(1);

  return account || null;
}

/**
 * Get all provider accounts for a user
 */
export async function getUserProviderAccounts(userId: number): Promise<ProviderAccountInfo[]> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const accounts = await db
    .select()
    .from(providerAccounts)
    .where(eq(providerAccounts.userId, userId));

  return accounts.map((account) => ({
    id: account.id,
    provider: account.provider as OAuthProvider,
    providerId: account.providerId,
    email: account.email,
    name: account.name,
    avatar: account.avatar,
    linkedAt: account.linkedAt.toISOString(),
    isPrimary: user.primaryProvider === account.provider,
  }));
}

/**
 * Create a new provider account and link it to a user
 */
export async function createProviderAccount(
  userId: number,
  provider: OAuthProvider,
  providerId: string,
  email: string,
  name: string | null,
  avatar: string | null
): Promise<ProviderAccount> {
  // Check if user already has this provider linked
  const existing = await db
    .select()
    .from(providerAccounts)
    .where(and(eq(providerAccounts.userId, userId), eq(providerAccounts.provider, provider)))
    .limit(1);

  if (existing.length > 0) {
    throw new Error(`User already has ${provider} provider linked`);
  }

  // Check if this provider account is already linked to another user
  const existingAccount = await getProviderAccount(provider, providerId);
  if (existingAccount && existingAccount.userId !== userId) {
    throw new Error(`This ${provider} account is already linked to another user`);
  }

  const newAccount: NewProviderAccount = {
    userId,
    provider,
    providerId,
    email,
    name,
    avatar,
  };

  const [account] = await db.insert(providerAccounts).values(newAccount).returning();

  if (!account) {
    throw new Error(`Failed to create provider account for ${provider}`);
  }

  return account;
}

/**
 * Delete a provider account (unlink provider from user)
 */
export async function deleteProviderAccount(
  userId: number,
  provider: OAuthProvider
): Promise<void> {
  // Check if this is the last provider
  const userAccounts = await db
    .select()
    .from(providerAccounts)
    .where(eq(providerAccounts.userId, userId));

  if (userAccounts.length <= 1) {
    throw new Error('Cannot unlink the last provider. User must have at least one authentication method.');
  }

  // Check if unlinking the primary provider
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  if (user.primaryProvider === provider) {
    // Set a new primary provider before unlinking
    const remainingProvider = userAccounts.find((acc) => acc.provider !== provider);
    if (remainingProvider) {
      await db
        .update(users)
        .set({ primaryProvider: remainingProvider.provider })
        .where(eq(users.id, userId));
    }
  }

  // Delete the provider account
  await db
    .delete(providerAccounts)
    .where(and(eq(providerAccounts.userId, userId), eq(providerAccounts.provider, provider)));
}

/**
 * Set a provider as the primary provider for a user
 */
export async function setPrimaryProvider(userId: number, provider: OAuthProvider): Promise<void> {
  // Verify user has this provider linked
  const account = await db
    .select()
    .from(providerAccounts)
    .where(and(eq(providerAccounts.userId, userId), eq(providerAccounts.provider, provider)))
    .limit(1);

  if (account.length === 0) {
    throw new Error(`User does not have ${provider} provider linked`);
  }

  await db.update(users).set({ primaryProvider: provider }).where(eq(users.id, userId));
}

/**
 * Check if a user has a specific provider linked
 */
export async function hasProviderLinked(userId: number, provider: OAuthProvider): Promise<boolean> {
  const [account] = await db
    .select()
    .from(providerAccounts)
    .where(and(eq(providerAccounts.userId, userId), eq(providerAccounts.provider, provider)))
    .limit(1);

  return !!account;
}

/**
 * Get user ID by provider and providerId
 */
export async function getUserIdByProvider(
  provider: OAuthProvider,
  providerId: string
): Promise<number | null> {
  const account = await getProviderAccount(provider, providerId);
  return account ? account.userId : null;
}
