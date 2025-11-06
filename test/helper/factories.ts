import { testDb } from './test-db';
import { users } from '@/db/schema/users';
import { providerAccounts } from '@/db/schema/provider-accounts';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import env from '@/config/env';
import type { JWTPayload } from '@/modules/auth/auth.types';

/**
 * User factory - creates test users with provider account
 */
export async function createUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const provider = (overrides.provider as 'google' | 'apple') || 'google';
  const providerId = overrides.providerId || `${provider}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const email = overrides.email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

  const [user] = await testDb
    .insert(users)
    .values({
      email,
      name: overrides.name || 'Test User',
      avatar: overrides.avatar || null,
      provider,
      providerId,
      primaryProvider: provider,
      role: overrides.role || 'user',
      ...overrides,
    })
    .returning();

  // Create corresponding provider account
  await testDb.insert(providerAccounts).values({
    userId: user!.id,
    provider,
    providerId,
    email,
    name: user!.name,
    avatar: user!.avatar,
  });

  return user!;
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
