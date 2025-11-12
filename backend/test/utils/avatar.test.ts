import { describe, it, expect } from 'vitest';
import { cleanAvatarUrl } from '@/utils/avatar';

/**
 * Test suite for avatar URL utilities
 * Ensures avatar URL cleaning works correctly for all scenarios
 */

describe('cleanAvatarUrl', () => {
  describe('Valid URLs', () => {
    it('should clean Google avatar URL with query parameters', () => {
      const url = 'https://lh3.googleusercontent.com/a/photo.jpg?sz=50&access_token=abc123';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://lh3.googleusercontent.com/a/photo.jpg');
    });

    it('should clean URL with multiple query parameters', () => {
      const url = 'https://example.com/avatar.png?size=100&quality=high&token=xyz';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com/avatar.png');
    });

    it('should clean URL with hash fragment', () => {
      const url = 'https://example.com/avatar.jpg#section';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com/avatar.jpg');
    });

    it('should clean URL with both query and hash', () => {
      const url = 'https://example.com/avatar.jpg?size=200#top';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com/avatar.jpg');
    });

    it('should keep pathname intact', () => {
      const url = 'https://example.com/path/to/user/avatar.jpg?token=123';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com/path/to/user/avatar.jpg');
    });

    it('should handle URLs with no query parameters', () => {
      const url = 'https://example.com/avatar.jpg';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com/avatar.jpg');
    });

    it('should preserve port number', () => {
      const url = 'https://example.com:8080/avatar.jpg?token=123';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com:8080/avatar.jpg');
    });

    it('should handle URLs with subdomain', () => {
      const url = 'https://cdn.example.com/avatars/user123.png?size=large';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://cdn.example.com/avatars/user123.png');
    });
  });

  describe('Invalid URLs', () => {
    it('should return null for undefined input', () => {
      const result = cleanAvatarUrl(undefined);

      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = cleanAvatarUrl(null);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = cleanAvatarUrl('');

      expect(result).toBeNull();
    });

    it('should return null for invalid URL string', () => {
      const result = cleanAvatarUrl('not-a-valid-url');

      expect(result).toBeNull();
    });

    it('should return null for malformed URL', () => {
      const result = cleanAvatarUrl('http://');

      expect(result).toBeNull();
    });

    it('should handle URL with spaces (gets encoded)', () => {
      const result = cleanAvatarUrl('https://example.com/path with spaces.jpg');

      // URL constructor auto-encodes spaces to %20
      expect(result).toBe('https://example.com/path%20with%20spaces.jpg');
    });

    it('should return null for non-string that looks like URL', () => {
      const result = cleanAvatarUrl('just some text http://example.com');

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle URL with only origin (no pathname)', () => {
      const url = 'https://example.com?token=123';
      const result = cleanAvatarUrl(url);

      // URL pathname is '/' when no path is specified
      expect(result).toBe('https://example.com/');
    });

    it('should handle URL with trailing slash', () => {
      const url = 'https://example.com/avatar.jpg/?token=123';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com/avatar.jpg/');
    });

    it('should handle URL with encoded characters in pathname', () => {
      const url = 'https://example.com/path%20with%20spaces/avatar.jpg?token=123';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com/path%20with%20spaces/avatar.jpg');
    });

    it('should handle very long query string', () => {
      const longQuery = 'a'.repeat(1000);
      const url = `https://example.com/avatar.jpg?token=${longQuery}`;
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://example.com/avatar.jpg');
      expect(result?.length).toBeLessThan(100); // Much shorter than original
    });
  });

  describe('Real-world OAuth provider URLs', () => {
    it('should handle Google Photos avatar URL', () => {
      const url = 'https://lh3.googleusercontent.com/a-/AOh14Gjxxxxxxxxxxx=s96-c';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://lh3.googleusercontent.com/a-/AOh14Gjxxxxxxxxxxx=s96-c');
    });

    it('should clean Apple avatar URL with query parameters', () => {
      const url = 'https://appleid.cdn-apple.com/static/bin/cb331/img/avatar.png?accessToken=abc';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://appleid.cdn-apple.com/static/bin/cb331/img/avatar.png');
    });

    it('should handle GitHub avatar URL', () => {
      const url = 'https://avatars.githubusercontent.com/u/12345678?v=4&size=100';
      const result = cleanAvatarUrl(url);

      expect(result).toBe('https://avatars.githubusercontent.com/u/12345678');
    });
  });
});
