/**
 * Ingresse Controllers
 * HTTP request handlers for Ingresse ticketing platform integration
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JWTPayload } from '@/modules/auth/auth.types';
import { loginToIngresse, verifyMfaCode, fetchUserInfo } from '../services/ingresse-api.service';
import {
  createIngresseProfile,
  getIngresseProfile,
  deleteIngresseProfile,
  checkIfUserLinked,
  syncUserDataFromApi,
} from '../services/ingresse-db.service';
import type { LoginRequest, MfaVerifyRequest, LinkAccountRequest } from '../types/ingresse.types';

/**
 * Handle Ingresse login
 * Proxies login request to Ingresse API
 * Returns token, userId, and authToken (if no MFA required)
 */
export async function handleLogin(
  request: FastifyRequest<{ Body: LoginRequest }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { email, password } = request.body;

    const result = await loginToIngresse(email, password);

    // Check if login failed
    if (!result.status) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: result.message || 'Login failed',
          remainingAttempts: result.remainingAttempts,
        },
      });
    }

    // Check if MFA is required
    const needsMfa = result.data.device.mfa && !result.data.authToken;

    return reply.send({
      success: true,
      needsMfa,
      data: {
        token: result.data.token,
        userId: result.data.userId,
        authToken: result.data.authToken,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to login to Ingresse');
    return reply.code(500).send({
      success: false,
      error: {
        code: 'INGRESSE_LOGIN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to login',
      },
    });
  }
}

/**
 * Handle MFA verification
 * Verifies MFA code and returns authToken
 */
export async function handleMfaVerify(
  request: FastifyRequest<{ Body: MfaVerifyRequest }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { userToken, otp } = request.body;

    const result = await verifyMfaCode(userToken, otp);

    if (!result.status) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'MFA_VERIFICATION_FAILED',
          message: 'Invalid MFA code',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        token: result.data.token,
        userId: result.data.userId,
        authToken: result.data.authToken,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to verify MFA code');
    return reply.code(500).send({
      success: false,
      error: {
        code: 'MFA_VERIFICATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to verify MFA code',
      },
    });
  }
}

/**
 * Handle account linking
 * Links Ingresse account to current user
 * Fetches full user profile from Ingresse and stores encrypted data
 */
export async function handleLinkAccount(
  request: FastifyRequest<{ Body: LinkAccountRequest }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = request.user as JWTPayload;
    const { token, userId, authToken } = request.body;

    // Check if user already has a linked account
    const isLinked = await checkIfUserLinked(user.id);
    if (isLinked) {
      return reply.code(409).send({
        success: false,
        error: {
          code: 'ACCOUNT_ALREADY_LINKED',
          message: 'User already has an Ingresse account linked. Please unlink first.',
        },
      });
    }

    // Fetch full user profile from Ingresse
    const userInfo = await fetchUserInfo(userId, token);

    // Store encrypted data in database
    await createIngresseProfile(user.id, { token, userId, authToken }, userInfo);

    request.log.info({ userId: user.id, ingresseUserId: userId }, 'Ingresse account linked successfully');

    return reply.send({
      success: true,
      message: 'Ingresse account linked successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to link Ingresse account');
    return reply.code(500).send({
      success: false,
      error: {
        code: 'LINK_ACCOUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to link account',
      },
    });
  }
}

/**
 * Handle get profile request
 * Returns user's linked Ingresse profile (decrypted)
 */
export async function handleGetProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = request.user as JWTPayload;

    const profile = await getIngresseProfile(user.id);

    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'No Ingresse account linked',
        },
      });
    }

    return reply.send({
      success: true,
      profile,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get Ingresse profile');
    return reply.code(500).send({
      success: false,
      error: {
        code: 'GET_PROFILE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get profile',
      },
    });
  }
}

/**
 * Handle account unlinking
 * Removes Ingresse account link (cascade deletes related data)
 */
export async function handleUnlink(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = request.user as JWTPayload;

    // Check if account is linked
    const isLinked = await checkIfUserLinked(user.id);
    if (!isLinked) {
      return reply.code(404).send({
        success: false,
        error: {
          code: 'NO_LINKED_ACCOUNT',
          message: 'No Ingresse account linked',
        },
      });
    }

    await deleteIngresseProfile(user.id);

    request.log.info({ userId: user.id }, 'Ingresse account unlinked successfully');

    return reply.send({
      success: true,
      message: 'Ingresse account unlinked successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to unlink Ingresse account');
    return reply.code(500).send({
      success: false,
      error: {
        code: 'UNLINK_ACCOUNT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to unlink account',
      },
    });
  }
}

/**
 * Handle profile sync
 * Re-fetches user data from Ingresse API and updates database
 */
export async function handleSyncProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = request.user as JWTPayload;

    // Get current profile to retrieve token
    const profile = await getIngresseProfile(user.id);

    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'No Ingresse account linked',
        },
      });
    }

    // Fetch fresh data from Ingresse API
    const userInfo = await fetchUserInfo(Number(profile.ingresseUserId), profile.token);

    // Update database with fresh data
    await syncUserDataFromApi(user.id, userInfo);

    request.log.info({ userId: user.id }, 'Ingresse profile synced successfully');

    return reply.send({
      success: true,
      message: 'Profile synced successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to sync Ingresse profile');
    return reply.code(500).send({
      success: false,
      error: {
        code: 'SYNC_PROFILE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to sync profile',
      },
    });
  }
}
