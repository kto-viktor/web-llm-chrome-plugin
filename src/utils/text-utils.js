/**
 * Text utility functions for word counting and text manipulation.
 * @module utils/text-utils
 */

/**
 * Counts the number of words in a text string.
 * @param {string} text - The text to count words in
 * @returns {number} The word count
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

/**
 * Truncates text to a maximum number of words.
 * @param {string} text - The text to truncate
 * @param {number} maxWords - Maximum number of words to keep
 * @returns {string} The truncated text
 */
export function truncateToWords(text, maxWords) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const words = text.trim().split(/\s+/);

  if (words.length <= maxWords) {
    return text.trim();
  }

  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Normalizes whitespace in text (collapses multiple spaces/newlines).
 * @param {string} text - The text to normalize
 * @returns {string} The normalized text
 */
export function normalizeWhitespace(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Checks if text exceeds a word limit.
 * @param {string} text - The text to check
 * @param {number} limit - The word limit
 * @returns {boolean} True if text exceeds the limit
 */
export function exceedsWordLimit(text, limit) {
  return countWords(text) > limit;
}
