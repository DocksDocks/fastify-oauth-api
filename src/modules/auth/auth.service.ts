/**
 * OAuth Authentication Service
 *
 * Handles OAuth flows for Google and Apple Sign-In
 * Includes auto-admin promotion based on email configuration
 */

import { eq } from 'drizzle-orm';
import { OAuth2Client } from 'google-auth-library';
import AppleSignIn from 'apple-signin-auth';
import { db } from '@/db/client';
import { users, type User, authorizedAdmins } from '@/db/schema';
import env from '@/config/env';
import type { OAuthProfile, GoogleUserInfo, AppleIdTokenClaims, OAuthError } from './auth.types';

/**
 * Get list of admin emails from environment
 */
function getAdminEmails(): string[] {
  const adminEmails = [env.ADMIN_EMAIL];

  if (env.ADMIN_EMAILS_ADDITIONAL) {
    const additional = env.ADMIN_EMAILS_ADDITIONAL.split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
    adminEmails.push(...additional);
  }

  return adminEmails;
}

/**
 * Check if email should be auto-promoted to admin
 * Checks both environment variables and database
 */
async function isAdminEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();

  // Check environment variables
  const adminEmails = getAdminEmails();
  if (adminEmails.includes(normalizedEmail)) {
    return true;
  }

  // Check database
  const [authorizedAdmin] = await db
    .select()
    .from(authorizedAdmins)
    .where(eq(authorizedAdmins.email, normalizedEmail))
    .limit(1);

  return !!authorizedAdmin;
}

/**
 * Check if email should be auto-promoted to superadmin
 */
function isSuperAdminEmail(email: string): boolean {
  if (!env.SUPER_ADMIN_EMAIL) {
    return false;
  }
  return env.SUPER_ADMIN_EMAIL.toLowerCase() === email.toLowerCase();
}

/**
 * Google OAuth: Exchange authorization code for user info
 * Works for both web and mobile flows
 */
export async function handleGoogleOAuth(code: string, redirectUri: string): Promise<OAuthProfile> {
  try {
    const oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
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
      avatar: userInfo.picture,
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
 * Handle OAuth callback: Create or update user, assign role
 */
export async function handleOAuthCallback(profile: OAuthProfile): Promise<User> {
  const { email, name, avatar, provider, providerId } = profile;

  // Check if user exists
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Determine role based on super admin and admin emails
  const shouldBeSuperAdmin = isSuperAdminEmail(email);
  const shouldBeAdmin = await isAdminEmail(email);
  const assignedRole = shouldBeSuperAdmin ? 'superadmin' : shouldBeAdmin ? 'admin' : 'user';

  if (user) {
    // Update existing user
    const updates: Partial<typeof users.$inferInsert> = {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    // Auto-promote to superadmin if email matches (highest priority)
    if (shouldBeSuperAdmin && user.role !== 'superadmin') {
      updates.role = 'superadmin';
      console.log(`[OAuth] Auto-promoted ${email} to superadmin role`);
    }
    // Auto-promote to admin if email matches and not already superadmin
    else if (shouldBeAdmin && user.role === 'user') {
      updates.role = 'admin';
      console.log(`[OAuth] Auto-promoted ${email} to admin role`);
    }

    // Update name/avatar if missing and provided
    if (!user.name && name) {
      updates.name = name;
    }
    if (!user.avatar && avatar) {
      updates.avatar = avatar;
    }

    [user] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();

    console.log(`[OAuth] Updated existing user: ${email} (${provider})`);
  } else {
    // Create new user
    [user] = await db
      .insert(users)
      .values({
        email,
        name: name || null,
        avatar: avatar || null,
        provider,
        providerId,
        role: assignedRole,
        lastLoginAt: new Date(),
      })
      .returning();

    console.log(`[OAuth] Created new user: ${email} (${provider}) with role: ${assignedRole}`);
  }

  if (!user) {
    throw new Error(`Failed to create or update user: ${email}`);
  }

  return user;
}

/**
 * Handle Admin OAuth callback: Validate existing admin/superadmin users only
 * IMPORTANT: Does NOT create new users - only allows existing admins to login
 */
export async function handleAdminOAuthCallback(profile: OAuthProfile): Promise<User> {
  const { email, provider } = profile;

  // Check if user exists
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    // User doesn't exist - reject
    throw new Error('Access denied. You are not registered as an administrator.');
  }

  if (user.role !== 'admin' && user.role !== 'superadmin') {
    // User exists but is not an admin - reject
    throw new Error('Access denied. Only administrators can access this panel.');
  }

  // User exists and is admin/superadmin - update last login and return
  const updates: Partial<typeof users.$inferInsert> = {
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  };

  // Update name/avatar if missing and provided
  if (!user.name && profile.name) {
    updates.name = profile.name;
  }
  if (!user.avatar && profile.avatar) {
    updates.avatar = profile.avatar;
  }

  const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();

  console.log(`[Admin OAuth] Admin login successful: ${email} (${provider}) - Role: ${user.role}`);

  return updatedUser!; // Non-null assertion: update with returning always returns at least one row
}

/**
 * Generate OAuth authorization URL for Google (Mobile - regular users)
 */
export function getGoogleAuthUrl(state?: string): string {
  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI_MOBILE,
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
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
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
