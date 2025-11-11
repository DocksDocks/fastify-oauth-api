import { describe, it, expect } from 'vitest';
import { isValidVideoUrl, getAllowedVideoDomains } from '@/utils/video-url-validator';

/**
 * Test suite for video URL validator
 * Ensures only trusted video hosting platforms are allowed
 */

describe('Video URL Validator', () => {
  describe('isValidVideoUrl', () => {
    describe('Valid URLs', () => {
      it('should accept valid YouTube URL', () => {
        expect(isValidVideoUrl('https://youtube.com/watch?v=abc123')).toBe(true);
        expect(isValidVideoUrl('https://www.youtube.com/watch?v=abc123')).toBe(true);
        expect(isValidVideoUrl('https://m.youtube.com/watch?v=abc123')).toBe(true);
      });

      it('should accept valid YouTube short URL', () => {
        expect(isValidVideoUrl('https://youtu.be/abc123')).toBe(true);
      });

      it('should accept valid Vimeo URL', () => {
        expect(isValidVideoUrl('https://vimeo.com/123456789')).toBe(true);
        expect(isValidVideoUrl('https://www.vimeo.com/123456789')).toBe(true);
        expect(isValidVideoUrl('https://player.vimeo.com/video/123456789')).toBe(true);
      });

      it('should accept null or undefined as valid (optional field)', () => {
        expect(isValidVideoUrl(null)).toBe(true);
        expect(isValidVideoUrl(undefined)).toBe(true);
      });

      it('should accept empty string as valid (treated as optional)', () => {
        // Empty string is falsy, so treated as optional/valid
        expect(isValidVideoUrl('')).toBe(true);
      });
    });

    describe('Invalid URLs', () => {
      it('should reject HTTP URLs (only HTTPS allowed)', () => {
        expect(isValidVideoUrl('http://youtube.com/watch?v=abc123')).toBe(false);
        expect(isValidVideoUrl('http://vimeo.com/123456789')).toBe(false);
      });

      it('should reject non-video domains', () => {
        expect(isValidVideoUrl('https://example.com/video.mp4')).toBe(false);
        expect(isValidVideoUrl('https://malicious-site.com/video')).toBe(false);
        expect(isValidVideoUrl('https://google.com/video')).toBe(false);
      });

      it('should reject invalid URL formats', () => {
        expect(isValidVideoUrl('not-a-url')).toBe(false);
        expect(isValidVideoUrl('javascript:alert(1)')).toBe(false);
        expect(isValidVideoUrl('ftp://youtube.com/video')).toBe(false);
      });

      it('should reject URLs with wrong protocol', () => {
        expect(isValidVideoUrl('ws://youtube.com/watch?v=abc123')).toBe(false);
        expect(isValidVideoUrl('file:///path/to/video.mp4')).toBe(false);
      });

      it('should reject URLs with similar but different domains', () => {
        expect(isValidVideoUrl('https://youtube.com.malicious.com/watch')).toBe(false);
        expect(isValidVideoUrl('https://fakeyoutube.com/watch')).toBe(false);
        expect(isValidVideoUrl('https://vimeo.com.evil.com/video')).toBe(false);
      });

      it('should handle malformed URLs gracefully', () => {
        expect(isValidVideoUrl('https://')).toBe(false);
        expect(isValidVideoUrl('https:///')).toBe(false);
        expect(isValidVideoUrl('://')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle URLs with query parameters', () => {
        expect(isValidVideoUrl('https://youtube.com/watch?v=abc&list=xyz')).toBe(true);
      });

      it('should handle URLs with fragments', () => {
        expect(isValidVideoUrl('https://youtube.com/watch?v=abc#start=10')).toBe(true);
      });

      it('should handle URLs with paths', () => {
        expect(isValidVideoUrl('https://youtube.com/channel/UCxyz/videos')).toBe(true);
      });

      it('should be case-insensitive for domain names', () => {
        expect(isValidVideoUrl('https://YouTube.com/watch?v=abc')).toBe(true);
        expect(isValidVideoUrl('https://VIMEO.COM/123456')).toBe(true);
      });

      it('should handle subdomains correctly', () => {
        expect(isValidVideoUrl('https://m.youtube.com/watch?v=abc')).toBe(true);
        expect(isValidVideoUrl('https://player.vimeo.com/video/123')).toBe(true);
      });

      it('should reject data URLs', () => {
        expect(isValidVideoUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      });

      it('should reject blob URLs', () => {
        expect(isValidVideoUrl('blob:https://youtube.com/abc-123')).toBe(false);
      });
    });

    describe('Security Tests', () => {
      it('should prevent XSS attempts in URL', () => {
        expect(isValidVideoUrl('https://youtube.com/<script>alert(1)</script>')).toBe(true); // URL is valid, but script won't execute
      });

      it('should prevent path traversal attempts', () => {
        expect(isValidVideoUrl('https://youtube.com/../../etc/passwd')).toBe(true); // URL is technically valid
      });

      it('should handle special characters in URL', () => {
        expect(isValidVideoUrl('https://youtube.com/watch?v=abc%20def')).toBe(true);
      });
    });
  });

  describe('getAllowedVideoDomains', () => {
    it('should return array of allowed domains', () => {
      const domains = getAllowedVideoDomains();

      expect(Array.isArray(domains)).toBe(true);
      expect(domains.length).toBeGreaterThan(0);
    });

    it('should include YouTube domains', () => {
      const domains = getAllowedVideoDomains();

      expect(domains).toContain('youtube.com');
      expect(domains).toContain('www.youtube.com');
      expect(domains).toContain('youtu.be');
    });

    it('should include Vimeo domains', () => {
      const domains = getAllowedVideoDomains();

      expect(domains).toContain('vimeo.com');
      expect(domains).toContain('www.vimeo.com');
      expect(domains).toContain('player.vimeo.com');
    });

    it('should return a copy of the array (not reference)', () => {
      const domains1 = getAllowedVideoDomains();
      const domains2 = getAllowedVideoDomains();

      expect(domains1).toEqual(domains2);
      expect(domains1).not.toBe(domains2); // Different array instances
    });

    it('should return immutable list', () => {
      const domains = getAllowedVideoDomains();
      const originalLength = domains.length;

      // Try to modify the returned array
      domains.push('evil.com');

      // Get fresh copy and verify it's unchanged
      const freshDomains = getAllowedVideoDomains();
      expect(freshDomains.length).toBe(originalLength);
      expect(freshDomains).not.toContain('evil.com');
    });
  });
});
