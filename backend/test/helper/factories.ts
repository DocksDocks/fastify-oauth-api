import { testDb } from './test-db';
import { users } from '@/db/schema/users';
import { providerAccounts } from '@/db/schema/provider-accounts';
import { eq } from 'drizzle-orm';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import env from '@/config/env';
import type { JWTPayload } from '@/modules/auth/auth.types';

/**
 * User factory - creates test users with provider account using transactions
 */
export async function createUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const provider = 'google';
  const providerId = `${provider}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const email = overrides.email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

  // Use transaction to create user + provider account + set primary provider
  const user = await testDb.transaction(async (tx) => {
    // Step 1: Create user without primaryProviderAccountId
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name: overrides.name || 'Test User',
        avatar: overrides.avatar || null,
        role: overrides.role || 'user',
        ...overrides,
      })
      .returning();

    // Step 2: Create provider account
    const [providerAccount] = await tx
      .insert(providerAccounts)
      .values({
        userId: newUser!.id,
        provider,
        providerId,
        email,
        name: newUser!.name,
        avatar: newUser!.avatar,
      })
      .returning();

    // Step 3: Set primaryProviderAccountId
    await tx
      .update(users)
      .set({ primaryProviderAccountId: providerAccount!.id })
      .where(eq(users.id, newUser!.id));

    return newUser!;
  });

  // Return updated user with primaryProviderAccountId
  const [updatedUser] = await testDb.select().from(users).where(eq(users.id, user.id));
  return updatedUser!;
}

/**
 * Generate JWT token for testing
 */
export async function generateTestToken(user: {
  id: number;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
}): Promise<{ accessToken: string; refreshToken: string }> {
  const fastify = Fastify({ logger: false });
  await fastify.register(fastifyJwt, { secret: env.JWT_SECRET });

  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
  });

  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  });

  await fastify.close();

  return { accessToken, refreshToken };
}
