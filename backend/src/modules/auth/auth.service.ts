/**
 * OAuth Authentication Service
 *
 * Handles OAuth flows for Google and Apple Sign-In
 * Includes auto-admin promotion based on email configuration
 */

import { eq } from 'drizzle-orm';
import { OAuth2Client } from 'google-auth-library';
import AppleSignIn from 'apple-signin-auth';
import crypto from 'crypto';
import { db } from '@/db/client';
import { users, type User, authorizedAdmins, providerAccounts } from '@/db/schema';
import env from '@/config/env';
import type {
  OAuthProfile,
  GoogleUserInfo,
  AppleIdTokenClaims,
  OAuthError,
  AccountLinkingRequest,
  OAuthProvider,
} from './auth.types';
import { cleanAvatarUrl } from '@/utils/avatar';
import {
  getProviderAccount,
  createProviderAccount,
  getUserProviderAccounts,
} from './provider-accounts.service';
import { createDefaultPreferences } from '@/services/user-preferences.service';

/**
 * Check if email should be auto-promoted to admin/superadmin
 * Checks database authorized_admins table
 */
async function isAuthorizedAdmin(email: string): Promise<{ isAdmin: boolean; isSuperAdmin: boolean }> {
  const normalizedEmail = email.toLowerCase();

  // Check database for authorized admin/superadmin
  const [authorizedAdmin] = await db
    .select()
    .from(authorizedAdmins)
    .where(eq(authorizedAdmins.email, normalizedEmail))
    .limit(1);

  if (!authorizedAdmin) {
    return { isAdmin: false, isSuperAdmin: false };
  }

  // If email exists in authorized_admins table, they're an admin
  return {
    isAdmin: true,
    isSuperAdmin: false, // SuperAdmin promotion happens via setup flow only
  };
}

/**
 * Verify Google ID token from native SDK
 * @param idToken - ID token from Google Sign-In SDK
 */
export async function verifyGoogleIdToken(idToken: string): Promise<OAuthProfile> {
  try {
    // Use web client ID for verification (same as what the SDK was configured with)
    const oauth2Client = new OAuth2Client(env.GOOGLE_CLIENT_ID_ADMIN);

    console.log('[Google ID Token] Verifying ID token');

    // Verify the ID token
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID_ADMIN, // Web client ID
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Invalid ID token payload');
    }

    console.log('[Google ID Token] Token verified successfully');

    return {
      provider: 'google',
      providerId: payload.sub,
      email: payload.email!.toLowerCase(),
      name: payload.name,
      avatar: cleanAvatarUrl(payload.picture),
      emailVerified: payload.email_verified || false,
    };
  } catch (error) {
    const err = error as Error;
    throw {
      provider: 'google',
      message: `Google ID token verification failed: ${err.message}`,
      code: 'GOOGLE_ID_TOKEN_ERROR',
    } as OAuthError;
  }
}

/**
 * Google OAuth: Exchange authorization code for user info
 * Works for both web and mobile flows
 * @param platform - 'web' | 'ios' | 'android' - determines which OAuth client to use
 */
export async function handleGoogleOAuth(
  code: string,
  redirectUri: string,
  platform: 'web' | 'ios' | 'android' = 'web'
): Promise<OAuthProfile> {
  try {
    // Select appropriate client ID based on platform
    let clientId: string | undefined;
    let clientSecret: string | undefined;

    if (platform === 'web') {
      clientId = env.GOOGLE_CLIENT_ID_ADMIN;
      clientSecret = env.GOOGLE_CLIENT_SECRET_ADMIN;
    } else if (platform === 'ios') {
      clientId = env.GOOGLE_CLIENT_ID_IOS;
      // iOS native apps don't use client secret
    } else if (platform === 'android') {
      clientId = env.GOOGLE_CLIENT_ID_ANDROID;
      // Android native apps don't use client secret
    }

    console.log('[Google OAuth] Exchanging code with:', {
      platform,
      clientId,
      redirectUri,
      codeLength: code.length,
    });

    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      redirectUri,
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Google user info: ${response.statusText}`);
    }

    const userInfo = (await response.json()) as GoogleUserInfo;

    return {
      provider: 'google',
      providerId: userInfo.id,
      email: userInfo.email.toLowerCase(),
      name: userInfo.name,
      avatar: cleanAvatarUrl(userInfo.picture),
      emailVerified: userInfo.verified_email,
    };
  } catch (error) {
    const err = error as Error;
    throw {
      provider: 'google',
      message: `Google OAuth failed: ${err.message}`,
      code: 'GOOGLE_OAUTH_ERROR',
    } as OAuthError;
  }
}

/**
 * Apple OAuth: Verify ID token and extract user info
 */
export async function handleAppleOAuth(
  _code: string,
  idToken: string,
  user?: string,
): Promise<OAuthProfile> {
  try {
    // Verify the ID token
    const appleIdTokenClaims = (await AppleSignIn.verifyIdToken(idToken, {
      audience: env.APPLE_CLIENT_ID!,
      ignoreExpiration: false,
    })) as unknown as AppleIdTokenClaims;

    // Extract email from verified token
    const email = appleIdTokenClaims.email.toLowerCase();
    const providerId = appleIdTokenClaims.sub;

    // Parse user data if provided (only on first login)
    let name: string | undefined;
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.name) {
          name = `${userData.name.firstName} ${userData.name.lastName}`.trim();
        }
      } catch {
        // User data parsing failed, continue without name
      }
    }

    return {
      provider: 'apple',
      providerId,
      email,
      name,
      avatar: undefined, // Apple doesn't provide avatar
      emailVerified:
        appleIdTokenClaims.email_verified === true || appleIdTokenClaims.email_verified === 'true',
    };
  } catch (error) {
    const err = error as Error;
    throw {
      provider: 'apple',
      message: `Apple OAuth failed: ${err.message}`,
      code: 'APPLE_OAUTH_ERROR',
    } as OAuthError;
  }
}

/**
 * Temporary storage for linking tokens (in-memory, expires after 10 minutes)
 * In production, use Redis for distributed systems
 */
const linkingTokenStore = new Map<
  string,
  { profile: OAuthProfile; userId: number; expiresAt: number }
>();

/**
 * Generate a temporary linking token for account confirmation
 */
function generateLinkingToken(profile: OAuthProfile, userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  linkingTokenStore.set(token, { profile, userId, expiresAt });

  // Cleanup expired tokens
  for (const [key, value] of linkingTokenStore.entries()) {
    if (value.expiresAt < Date.now()) {
      linkingTokenStore.delete(key);
    }
  }

  return token;
}

/**
 * Retrieve and validate a linking token
 */
export function consumeLinkingToken(token: string): {
  profile: OAuthProfile;
  userId: number;
} | null {
  const data = linkingTokenStore.get(token);

  if (!data || data.expiresAt < Date.now()) {
    linkingTokenStore.delete(token);
    return null;
  }

  linkingTokenStore.delete(token); // One-time use
  return { profile: data.profile, userId: data.userId };
}

/**
 * Handle OAuth callback: Multi-provider support with account linking
 * Returns User if authenticated, or AccountLinkingRequest if confirmation needed
 */
export async function handleOAuthCallback(
  profile: OAuthProfile
): Promise<User | AccountLinkingRequest> {
  const { email, name, avatar, provider, providerId } = profile;

  // Step 1: Look up by provider + providerId (unique OAuth account)
  const providerAccount = await getProviderAccount(provider as OAuthProvider, providerId);

  if (providerAccount) {
    // User already has this provider linked - authenticate
    const [user] = await db.select().from(users).where(eq(users.id, providerAccount.userId)).limit(1);

    if (!user) {
      throw new Error(`User not found for provider account: ${providerId}`);
    }

    // Update lastLoginAt
    const updates: Partial<typeof users.$inferInsert> = {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    // Update name if user doesn't have one and OAuth provides it
    if (!user.name && name) {
      updates.name = name;
    }

    // Update avatar if user doesn't have one and OAuth provides it
    if (!user.avatar && avatar) {
      updates.avatar = avatar;
    }

    // Auto-promote if applicable (check authorized_admins table)
    const { isAdmin, isSuperAdmin } = await isAuthorizedAdmin(email);

    if (isSuperAdmin && user.role !== 'superadmin') {
      updates.role = 'superadmin';
      console.log(`[OAuth] Auto-promoted ${email} to superadmin role`);
    } else if (isAdmin && user.role === 'user') {
      updates.role = 'admin';
      console.log(`[OAuth] Auto-promoted ${email} to admin role`);
    }

    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();

    if (!updatedUser) {
      throw new Error(`Failed to update user: ${email}`);
    }

    console.log(`[OAuth] Authenticated existing user: ${email} (${provider})`);
    return updatedUser;
  }

  // Step 2: Provider account not found - check if email exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existingUser) {
    // User exists with same email but different provider
    // Get their existing providers
    const existingProviders = await getUserProviderAccounts(existingUser.id);
    const providersList = existingProviders.map((p) => p.provider);

    // Generate linking token
    const linkingToken = generateLinkingToken(profile, existingUser.id);

    // Return account linking request
    const linkingRequest: AccountLinkingRequest = {
      linkingToken,
      existingUser: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        providers: providersList,
      },
      newProvider: {
        provider: provider as OAuthProvider,
        providerId,
        email,
        name: name || null,
        avatar: avatar || null,
      },
    };

    console.log(
      `[OAuth] Account linking required for ${email}: ${provider} → existing user #${existingUser.id}`
    );
    return linkingRequest;
  }

  // Step 3: New user - create user and provider account
  const { isAdmin, isSuperAdmin } = await isAuthorizedAdmin(email);
  const assignedRole = isSuperAdmin ? 'superadmin' : isAdmin ? 'admin' : 'user';

  // Use transaction to create user + provider account + set primary provider
  const newUser = await db.transaction(async (tx) => {
    // Step 1: Create user without primaryProviderAccountId
    const [user] = await tx
      .insert(users)
      .values({
        email,
        name: name || null,
        avatar: avatar || null,
        role: assignedRole,
        lastLoginAt: new Date(),
      })
      .returning();

    if (!user) {
      throw new Error(`Failed to create user: ${email}`);
    }

    // Step 2: Create provider account
    const [providerAccount] = await tx
      .insert(providerAccounts)
      .values({
        userId: user.id,
        provider: provider as OAuthProvider,
        providerId,
        email,
        name: name || null,
        avatar: avatar || null,
      })
      .returning();

    if (!providerAccount) {
      throw new Error(`Failed to create provider account for ${provider}`);
    }

    // Step 3: Set primaryProviderAccountId
    await tx
      .update(users)
      .set({ primaryProviderAccountId: providerAccount.id })
      .where(eq(users.id, user.id));

    return user;
  });

  // Create default user preferences
  await createDefaultPreferences(newUser.id, 'pt-BR');

  console.log(`[OAuth] Created new user: ${email} (${provider}) with role: ${assignedRole}`);
  return newUser;
}

/**
 * Confirm account linking and merge provider accounts
 */
export async function confirmAccountLinking(linkingToken: string): Promise<User> {
  const tokenData = consumeLinkingToken(linkingToken);

  if (!tokenData) {
    throw new Error('Invalid or expired linking token');
  }

  const { profile, userId } = tokenData;
  const { email, name, avatar, provider, providerId } = profile;

  // Verify user still exists
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Verify email matches (case-insensitive)
  if (user.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Email mismatch - cannot link accounts with different emails');
  }

  // Create provider account link
  await createProviderAccount(
    userId,
    provider as OAuthProvider,
    providerId,
    email,
    name || null,
    avatar || null
  );

  // Update user lastLoginAt
  const [updatedUser] = await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    throw new Error(`Failed to update user after linking: ${userId}`);
  }

  console.log(`[OAuth] Linked ${provider} provider to user #${userId} (${email})`);
  return updatedUser;
}

/**
 * Handle Admin OAuth callback: Validate and auto-create admin users
 * Creates new users if email is in the authorized_admins database table
 * Rejects users who are not authorized admins
 * Role assignment: Checks isSuperAdmin flag in authorized_admins table
 */
export async function handleAdminOAuthCallback(profile: OAuthProfile): Promise<User> {
  const { email, provider, name, avatar, providerId } = profile;

  // Check if email is authorized as admin/superadmin
  const { isAdmin, isSuperAdmin } = await isAuthorizedAdmin(email);

  if (!isSuperAdmin && !isAdmin) {
    // Email is not in authorized admin list - reject
    throw new Error('Access denied. You are not authorized as an administrator.');
  }

  // Check if user exists
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    // User doesn't exist - create with appropriate admin role
    const assignedRole = isSuperAdmin ? 'superadmin' : 'admin';

    // Use transaction to create user + provider account + set primary provider
    user = await db.transaction(async (tx) => {
      // Step 1: Create user without primaryProviderAccountId
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          name: name || null,
          avatar: avatar || null,
          role: assignedRole,
          lastLoginAt: new Date(),
        })
        .returning();

      if (!newUser) {
        throw new Error('Failed to create user');
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
        throw new Error(`Failed to create provider account for ${provider}`);
      }

      // Step 3: Set primaryProviderAccountId
      await tx
        .update(users)
        .set({ primaryProviderAccountId: providerAccount.id })
        .where(eq(users.id, newUser.id));

      return newUser;
    });

    console.log(`[Admin OAuth] Created new admin user: ${email} (${provider}) with role: ${assignedRole}`);
    return user;
  }

  // User exists - check if they need role upgrade
  const updates: Partial<typeof users.$inferInsert> = {
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  };

  // Auto-promote to superadmin if email matches (highest priority)
  if (isSuperAdmin && user.role !== 'superadmin') {
    updates.role = 'superadmin';
    console.log(`[Admin OAuth] Auto-promoted ${email} to superadmin role`);
  }
  // Auto-promote to admin if email matches and not already superadmin
  else if (isAdmin && user.role === 'user') {
    updates.role = 'admin';
    console.log(`[Admin OAuth] Auto-promoted ${email} to admin role`);
  }
  // User exists but is not admin/superadmin and not in authorized list
  else if (user.role !== 'admin' && user.role !== 'superadmin') {
    throw new Error('Access denied. Only administrators can access this panel.');
  }

  // Update name/avatar if missing and provided
  if (!user.name && name) {
    updates.name = name;
  }
  if (!user.avatar && avatar) {
    updates.avatar = avatar;
  }

  const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();

  console.log(`[Admin OAuth] Admin login successful: ${email} (${provider}) - Role: ${updatedUser!.role}`);

  return updatedUser!; // Non-null assertion: update with returning always returns at least one row
}

/**
 * Generate OAuth authorization URL for Google (Mobile - regular users)
 * Note: Mobile apps using expo-auth-session generate their own OAuth URL
 * This function is kept for reference/testing purposes
 */
export function getGoogleAuthUrl(state?: string): string {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID_IOS,
    undefined, // iOS apps don't use client secret
    env.GOOGLE_REDIRECT_URI_IOS,
  );

  const scopes = env.GOOGLE_SCOPES.split(' ');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state || undefined,
    prompt: 'consent',
  });

  return authUrl;
}

/**
 * Generate OAuth authorization URL for Google (Admin panel - admins only)
 */
export function getGoogleAuthUrlAdmin(state?: string): string {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID_ADMIN,
    env.GOOGLE_CLIENT_SECRET_ADMIN,
    env.GOOGLE_REDIRECT_URI_ADMIN,
  );

  const scopes = env.GOOGLE_SCOPES.split(' ');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state || undefined,
    prompt: 'consent',
  });

  return authUrl;
}

/**
 * Generate OAuth authorization URL for Apple (Mobile - regular users)
 */
export function getAppleAuthUrl(state?: string): string {
  const scopes = env.APPLE_SCOPES.split(' ');

  const params = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID!,
    redirect_uri: env.APPLE_REDIRECT_URI_MOBILE!,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: scopes.join(' '),
    ...(state && { state }),
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

/**
 * Generate OAuth authorization URL for Apple (Admin panel - admins only)
 */
export function getAppleAuthUrlAdmin(state?: string): string {
  const scopes = env.APPLE_SCOPES.split(' ');

  const params = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID!,
    redirect_uri: env.APPLE_REDIRECT_URI_ADMIN!,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: scopes.join(' '),
    ...(state && { state }),
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return user || null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

  return user || null;
}

/**
 * Update user's last login time
 */
export async function updateLastLogin(userId: number): Promise<void> {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}
