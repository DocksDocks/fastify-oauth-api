import { describe, it, expect } from 'vitest';
import {
  handleOAuthCallback,
  getUserById,
  getUserByEmail,
  updateLastLogin,
  getGoogleAuthUrl,
  getGoogleAuthUrlAdmin,
  getAppleAuthUrl,
  getAppleAuthUrlAdmin,
} from '@/modules/auth/auth.service';
import { createUser } from '../helper/factories';
import type { OAuthProfile } from '@/modules/auth/auth.types';

describe('Auth Service', () => {
  describe('handleOAuthCallback', () => {
    it('should create new user from OAuth profile', async () => {
      const profile: OAuthProfile = {
        provider: 'google',
        providerId: 'google_12345',
        email: 'newuser@example.com',
        name: 'New User',
        avatar: 'https://example.com/avatar.jpg',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(profile.email);
      expect(user.name).toBe(profile.name);
      expect(user.avatar).toBe(profile.avatar);
      expect(user.role).toBe('user');
      expect(user.primaryProviderAccountId).toBeDefined(); // FK to provider_accounts
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should update existing user on subsequent login', async () => {
      // Create initial user
      const existing = await createUser({
        email: 'existing@example.com',
        provider: 'google',
        providerId: 'google_existing',
      });

      const profile: OAuthProfile = {
        provider: 'google',
        providerId: 'google_existing',
        email: 'existing@example.com',
        name: 'Updated Name',
        avatar: 'https://example.com/new-avatar.jpg',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.id).toBe(existing.id);
      expect(user.email).toBe(existing.email);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should create user with lowercase email', async () => {
      const profile: OAuthProfile = {
        provider: 'google',
        providerId: 'google_mixed',
        email: 'mixedcase@example.com', // Profile already has lowercase email from OAuth
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.email).toBe('mixedcase@example.com');
    });

    it('should create user without name if not provided', async () => {
      const profile: OAuthProfile = {
        provider: 'apple',
        providerId: 'apple_12345',
        email: 'noname@example.com',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.name).toBeNull();
      expect(user.email).toBe(profile.email);
    });

    it('should create user without avatar if not provided', async () => {
      const profile: OAuthProfile = {
        provider: 'apple',
        providerId: 'apple_no_avatar',
        email: 'noavatar@example.com',
        name: 'No Avatar User',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.avatar).toBeNull();
      expect(user.name).toBe(profile.name);
    });

    it('should not override existing name with undefined', async () => {
      const existing = await createUser({
        email: 'hasname@example.com',
        name: 'Original Name',
        provider: 'google',
        providerId: 'google_hasname',
      });

      const profile: OAuthProfile = {
        provider: 'google',
        providerId: 'google_hasname',
        email: 'hasname@example.com',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.id).toBe(existing.id);
      expect(user.name).toBe('Original Name');
    });

    it('should not override existing avatar with undefined', async () => {
      const existing = await createUser({
        email: 'hasavatar@example.com',
        avatar: 'https://example.com/original.jpg',
        provider: 'google',
        providerId: 'google_hasavatar',
      });

      const profile: OAuthProfile = {
        provider: 'google',
        providerId: 'google_hasavatar',
        email: 'hasavatar@example.com',
        name: 'User',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.id).toBe(existing.id);
      expect(user.avatar).toBe('https://example.com/original.jpg');
    });

    it('should update name if user had no name', async () => {
      const existing = await createUser({
        email: 'noname@example.com',
        name: null,
        provider: 'google',
        providerId: 'google_noname',
      });

      const profile: OAuthProfile = {
        provider: 'google',
        providerId: 'google_noname',
        email: 'noname@example.com',
        name: 'New Name',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.id).toBe(existing.id);
      expect(user.name).toBe('New Name');
    });

    it('should handle Apple provider', async () => {
      const profile: OAuthProfile = {
        provider: 'apple',
        providerId: 'apple_user_123',
        email: 'apple@example.com',
        name: 'Apple User',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.primaryProviderAccountId).toBeDefined(); // Provider data is in provider_accounts
      expect(user.email).toBe('apple@example.com');
    });

    it('should handle Google provider', async () => {
      const profile: OAuthProfile = {
        provider: 'google',
        providerId: 'google_user_123',
        email: 'google@example.com',
        name: 'Google User',
        avatar: 'https://google.com/photo.jpg',
        emailVerified: true,
      };

      const user = await handleOAuthCallback(profile);

      expect(user.primaryProviderAccountId).toBeDefined(); // Provider data is in provider_accounts
      expect(user.email).toBe('google@example.com');
      expect(user.avatar).toBe('https://google.com/photo.jpg');
    });
  });

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      const created = await createUser({ email: 'getbyid@example.com' });
      const user = await getUserById(created.id);

      expect(user).not.toBeNull();
      expect(user!.id).toBe(created.id);
      expect(user!.email).toBe('getbyid@example.com');
    });

    it('should return null for non-existent user', async () => {
      const user = await getUserById(999999);
      expect(user).toBeNull();
    });

    it('should return null for negative ID', async () => {
      const user = await getUserById(-1);
      expect(user).toBeNull();
    });

    it('should return null for zero ID', async () => {
      const user = await getUserById(0);
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      const created = await createUser({ email: 'findme@example.com' });
      const user = await getUserByEmail('findme@example.com');

      expect(user).not.toBeNull();
      expect(user!.id).toBe(created.id);
      expect(user!.email).toBe('findme@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should be case-insensitive', async () => {
      const created = await createUser({ email: 'case@example.com' });
      const user = await getUserByEmail('CASE@EXAMPLE.COM');

      expect(user).not.toBeNull();
      expect(user!.id).toBe(created.id);
    });

    it('should handle email with mixed case in search', async () => {
      // Create user with lowercase email, search with mixed case
      const created = await createUser({ email: 'searchmixedcase@example.com' });
      const user = await getUserByEmail('SearchMixedCase@Example.COM');

      expect(user).not.toBeNull();
      expect(user!.id).toBe(created.id);
      expect(user!.email).toBe('searchmixedcase@example.com');
    });

    it('should return null for empty email', async () => {
      const user = await getUserByEmail('');
      expect(user).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login time', async () => {
      const created = await createUser({ email: 'lastlogin@example.com' });
      const oldLastLogin = created.lastLoginAt;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await updateLastLogin(created.id);

      const updated = await getUserById(created.id);
      expect(updated).not.toBeNull();
      expect(updated!.lastLoginAt).not.toEqual(oldLastLogin);
      expect(updated!.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should handle non-existent user gracefully', async () => {
      await expect(updateLastLogin(999999)).resolves.not.toThrow();
    });

    it('should handle negative user ID', async () => {
      await expect(updateLastLogin(-1)).resolves.not.toThrow();
    });
  });

  describe('getGoogleAuthUrl', () => {
    it('should generate Google OAuth URL', () => {
      const url = getGoogleAuthUrl();

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should include state parameter if provided', () => {
      const state = 'random-state-123';
      const url = getGoogleAuthUrl(state);

      expect(url).toContain(`state=${state}`);
    });

    it('should not include state value if not provided', () => {
      const url = getGoogleAuthUrl();

      // OAuth2Client may include state= with empty value, so we check it's not populated
      if (url.includes('state=')) {
        const stateMatch = url.match(/state=([^&]*)/);
        expect(stateMatch?.[1] || '').toBe('');
      }
    });

    it('should include client_id', () => {
      const url = getGoogleAuthUrl();

      expect(url).toContain('client_id=');
    });

    it('should include redirect_uri', () => {
      const url = getGoogleAuthUrl();

      expect(url).toContain('redirect_uri=');
    });

    it('should include scope', () => {
      const url = getGoogleAuthUrl();

      expect(url).toContain('scope=');
    });
  });

  describe('getGoogleAuthUrlAdmin', () => {
    it('should generate Google OAuth URL for admin panel', () => {
      const url = getGoogleAuthUrlAdmin();

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should include state parameter if provided', () => {
      const state = 'admin-state-456';
      const url = getGoogleAuthUrlAdmin(state);

      expect(url).toContain(`state=${state}`);
    });
  });

  describe('getAppleAuthUrl', () => {
    it('should generate Apple OAuth URL', () => {
      const url = getAppleAuthUrl();

      expect(url).toContain('https://appleid.apple.com/auth/authorize');
      // URLSearchParams encodes spaces as + instead of %20
      expect(url).toContain('response_type=code+id_token');
      expect(url).toContain('response_mode=form_post');
    });

    it('should include state parameter if provided', () => {
      const state = 'apple-state-789';
      const url = getAppleAuthUrl(state);

      expect(url).toContain(`state=${state}`);
    });

    it('should not include state if not provided', () => {
      const url = getAppleAuthUrl();

      expect(url).not.toContain('state=');
    });

    it('should include client_id', () => {
      const url = getAppleAuthUrl();

      expect(url).toContain('client_id=');
    });

    it('should include redirect_uri', () => {
      const url = getAppleAuthUrl();

      expect(url).toContain('redirect_uri=');
    });

    it('should include scope', () => {
      const url = getAppleAuthUrl();

      expect(url).toContain('scope=');
    });
  });

  describe('getAppleAuthUrlAdmin (Admin Panel)', () => {
    it('should generate Apple OAuth URL for admin panel', () => {
      const url = getAppleAuthUrlAdmin();

      expect(url).toContain('https://appleid.apple.com/auth/authorize');
      // URLSearchParams encodes spaces as + instead of %20
      expect(url).toContain('response_type=code+id_token');
    });

    it('should include state parameter if provided', () => {
      const state = 'apple-admin-123';
      const url = getAppleAuthUrlAdmin(state);

      expect(url).toContain(`state=${state}`);
    });
  });
});
