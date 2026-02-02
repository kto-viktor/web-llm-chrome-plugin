/**
 * URL utilities for page matching and normalization.
 * @module utils/url-utils
 */

/**
 * Normalizes URL for page matching.
 * Removes fragment (#) and trailing slash. Keeps origin + path.
 * @param {string} url - The URL to normalize
 * @returns {string|null} Normalized URL or null if invalid
 */
export function normalizePageUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return null;
  }
}
