/**
 * Avatar URL utilities
 *
 * Helper functions for cleaning and validating avatar URLs from OAuth providers
 */

/**
 * Clean avatar URL by removing query parameters and tokens
 *
 * OAuth providers (especially Google) often return avatar URLs with embedded
 * access tokens and query parameters that can make URLs extremely long (1000+ chars).
 * These parameters are temporary and unnecessary - the base URL works perfectly.
 *
 * @param url - Raw avatar URL from OAuth provider
 * @returns Clean URL with only origin + pathname, or undefined if invalid
 *
 * @example
 * // Google URL with tokens
 * cleanAvatarUrl('https://lh3.googleusercontent.com/a/photo.jpg?sz=50&access_token=xxx')
 * // Returns: 'https://lh3.googleusercontent.com/a/photo.jpg'
 *
 * @example
 * // Invalid URL
 * cleanAvatarUrl('not-a-url')
 * // Returns: undefined
 */
export function cleanAvatarUrl(url: string | undefined | null): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    // Return only origin + pathname (no query parameters or hash)
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch {
    // If URL parsing fails, return null
    return null;
  }
}
