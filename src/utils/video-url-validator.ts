/**
 * Video URL Validator
 * Validates video URLs to prevent malicious links
 * Only allows trusted video hosting platforms
 */

const ALLOWED_VIDEO_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'www.youtube.com',
  'm.youtube.com',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
  // Add more trusted domains as needed
];

/**
 * Check if a video URL is from a trusted domain
 */
export function isValidVideoUrl(url: string | null | undefined): boolean {
  if (!url) {
    return true; // null/undefined is valid (optional field)
  }

  try {
    const parsedUrl = new URL(url);

    // Check protocol (only https allowed)
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Check if domain is in allowed list
    const hostname = parsedUrl.hostname.toLowerCase();
    return ALLOWED_VIDEO_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Get list of allowed video domains (for error messages)
 */
export function getAllowedVideoDomains(): string[] {
  return [...ALLOWED_VIDEO_DOMAINS];
}
