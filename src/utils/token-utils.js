/**
 * Token counting and truncation utilities.
 * Uses gpt-tokenizer for accurate token counting.
 * @module utils/token-utils
 */

import { encode, decode } from 'gpt-tokenizer';

/**
 * Counts the number of tokens in a text string.
 * @param {string} text - The text to count tokens in
 * @returns {number} The token count
 */
export function countTokens(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  return encode(text).length;
}

/**
 * Truncates text to a maximum number of tokens.
 * @param {string} text - The text to truncate
 * @param {number} maxTokens - Maximum number of tokens to keep
 * @returns {Object} Object with truncated text, token count, and truncated flag
 */
export function truncateToTokens(text, maxTokens) {
  if (!text || typeof text !== 'string') {
    return { text: '', tokenCount: 0, truncated: false };
  }

  const tokens = encode(text);

  if (tokens.length <= maxTokens) {
    return { text, tokenCount: tokens.length, truncated: false };
  }

  // Truncate tokens and decode back to text
  const truncatedTokens = tokens.slice(0, maxTokens);
  const truncatedText = decode(truncatedTokens);

  return {
    text: truncatedText + '...',
    tokenCount: maxTokens,
    truncated: true
  };
}

/**
 * Checks if text exceeds a token limit.
 * @param {string} text - The text to check
 * @param {number} limit - The token limit
 * @returns {boolean} True if text exceeds the limit
 */
export function exceedsTokenLimit(text, limit) {
  return countTokens(text) > limit;
}
