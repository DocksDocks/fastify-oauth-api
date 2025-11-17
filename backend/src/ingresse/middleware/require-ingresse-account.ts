/**
 * Require Ingresse Account Middleware
 *
 * Middleware that validates if user has linked an Ingresse account
 * Fetches decrypted token from database and attaches to request
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JWTPayload } from '@/modules/auth/auth.types';
import { getIngresseProfile } from '../services/ingresse-db.service';

// Extend FastifyRequest to include Ingresse data
declare module 'fastify' {
  interface FastifyRequest {
    ingresseToken?: string;
    ingresseUserId?: string;
  }
}

/**
 * Middleware that requires user to have linked Ingresse account
 * Must be used after authentication middleware
 */
export async function requireIngresseAccount(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user as JWTPayload;

  // Fast check using JWT flag
  if (!user.ingresseLinked) {
    return reply.code(403).send({
      success: false,
      error: {
        code: 'INGRESSE_ACCOUNT_NOT_LINKED',
        message: 'Você precisa conectar sua conta da Ingresse para efetuar esta requisição',
      },
    });
  }

  // Fetch full profile with decrypted token from database
  const profile = await getIngresseProfile(user.id);

  // Double-check in case JWT flag is stale
  if (!profile) {
    return reply.code(403).send({
      success: false,
      error: {
        code: 'INGRESSE_ACCOUNT_NOT_LINKED',
        message: 'Você precisa conectar sua conta da Ingresse para efetuar esta requisição',
      },
    });
  }

  // Attach decrypted token and userId to request for use in controllers
  request.ingresseToken = profile.token;
  request.ingresseUserId = profile.ingresseUserId;
}
