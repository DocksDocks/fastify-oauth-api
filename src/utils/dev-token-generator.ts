/**
 * Development JWT Token Generator
 * Generates valid JWT tokens for testing purposes
 *
 * WARNING: This is for DEVELOPMENT ONLY
 * DO NOT use in production or expose as an API endpoint in production
 */

import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { db } from '@/db/client';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm';
import env from '@/config/env';
import type { JWTPayload } from '@/modules/auth/auth.types';

export async function generateDevToken(userId: number): Promise<{
  user: {
    id: number;
    email: string;
    name: string | null;
    role: 'user' | 'admin' | 'superadmin';
  };
  accessToken: string;
  refreshToken: string;
}> {
  // Get user from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  // Initialize minimal Fastify instance for JWT signing
  // This ensures consistency with jwt.service.ts approach
  const fastify = Fastify({ logger: false });
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  // Create JWT payload
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  // Generate access token (15 minutes)
  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
  });

  // Generate refresh token (7 days)
  const refreshToken = fastify.jwt.sign(payload, {
    expiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  });

  // Clean up Fastify instance
  await fastify.close();

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const userIdArg = process.argv[2];

  if (!userIdArg) {
    console.error('\n❌ Usage: tsx src/utils/dev-token-generator.ts <user-id>');
    console.error('   Example: tsx src/utils/dev-token-generator.ts 1\n');
    process.exit(1);
  }

  const userId = parseInt(userIdArg, 10);

  if (isNaN(userId)) {
    console.error('\n❌ Invalid user ID. Please provide a valid number.');
    console.error('   Example: tsx src/utils/dev-token-generator.ts 1\n');
    process.exit(1);
  }

  generateDevToken(userId)
    .then((result) => {
      console.log('\n🔐 JWT Tokens Generated Successfully!');
      console.log('═════════════════════════════════════════════════════════════');
      console.log(`📧 User: ${result.user.name} (${result.user.email})`);
      console.log(`👤 Role: ${result.user.role}`);
      console.log(`🆔 ID: ${result.user.id}`);
      console.log('═════════════════════════════════════════════════════════════\n');

      console.log('🎫 ACCESS TOKEN (valid for 15 minutes):');
      console.log('─────────────────────────────────────────────────────────────');
      console.log(result.accessToken);
      console.log('─────────────────────────────────────────────────────────────\n');

      console.log('🔄 REFRESH TOKEN (valid for 7 days):');
      console.log('─────────────────────────────────────────────────────────────');
      console.log(result.refreshToken);
      console.log('─────────────────────────────────────────────────────────────\n');

      console.log('💡 Test with curl:');
      console.log(`curl -H "Authorization: Bearer ${result.accessToken}" http://localhost:3000/api/profile\n`);

      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error generating token:', error.message);
      process.exit(1);
    });
}
