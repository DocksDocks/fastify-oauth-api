/**
 * OAuth Authentication Type Definitions
 *
 * Contains all TypeScript interfaces and types for OAuth authentication
 * Supports both Google and Apple Sign-In
 */

export type OAuthProvider = 'google' | 'apple';

/**
 * OAuth profile returned from provider
 */
export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name?: string;
  avatar?: string | null;
  emailVerified?: boolean;
}

/**
 * Google OAuth token response
 */
export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
  refresh_token?: string;
}

/**
 * Google user info response
 */
export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

/**
 * Apple ID token claims
 */
export interface AppleIdTokenClaims {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  at_hash: string;
  email: string;
  email_verified: boolean | string;
  auth_time: number;
  nonce_supported: boolean;
}

/**
 * Apple user info (first time only)
 */
export interface AppleUserInfo {
  name?: {
    firstName: string;
    lastName: string;
  };
  email: string;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  id: number;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  ingresseLinked?: boolean; // Flag indicating if user has linked Ingresse account
  jti?: string; // JWT ID (unique identifier for refresh tokens)
  iat?: number;
  exp?: number;
}

/**
 * Token pair response
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login response sent to client
 */
export interface LoginResponse {
  success: true;
  data: {
    user: {
      id: number;
      email: string;
      name: string | null;
      avatar: string | null;
      role: 'user' | 'admin' | 'superadmin';
    };
    tokens: TokenPair;
  };
}

/**
 * OAuth state parameter (for CSRF protection)
 */
export interface OAuthState {
  provider: OAuthProvider;
  timestamp: number;
  nonce: string;
  redirectUrl?: string;
}

/**
 * OAuth error types
 */
export class OAuthError extends Error {
  constructor(
    public provider: OAuthProvider,
    public override message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

/**
 * Apple OAuth configuration
 */
export interface AppleOAuthConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Google OAuth configuration
 */
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Provider account (for multi-provider support)
 */
export interface ProviderAccountInfo {
  id: number;
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string | null;
  avatar: string | null;
  linkedAt: string;
  isPrimary: boolean;
}

/**
 * Account linking request (when same email found with different provider)
 */
export interface AccountLinkingRequest {
  linkingToken: string; // Temporary token for linking
  existingUser: {
    id: number;
    email: string;
    name: string | null;
    providers: OAuthProvider[];
  };
  newProvider: {
    provider: OAuthProvider;
    providerId: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
}

/**
 * Account linking response (returned when linking is required)
 */
export interface AccountLinkingResponse {
  success: false;
  requiresLinking: true;
  data: AccountLinkingRequest;
}

/**
 * Account linking confirmation payload
 */
export interface LinkProviderPayload {
  linkingToken: string;
  confirm: boolean;
}

/**
 * Unlink provider response
 */
export interface UnlinkProviderResponse {
  success: true;
  message: string;
  remainingProviders: ProviderAccountInfo[];
}
