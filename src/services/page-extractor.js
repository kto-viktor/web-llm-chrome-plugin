/**
 * Service for extracting page content from the active tab.
 * @module services/page-extractor
 */

import { countTokens, truncateToTokens } from '../utils/token-utils.js';

/**
 * Maximum tokens to include from page content.
 * Leaves room for system prompt (~500) + history (~1000) within 4096 context.
 */
const MAX_PAGE_TOKENS = 2500;

/**
 * Fallback message when page content is unavailable.
 */
const UNAVAILABLE_MESSAGE = 'Page content is not available. If you need it, ask user to refresh the page';

/**
 * Extracted page content.
 * @typedef {Object} PageContent
 * @property {string} title - The page title
 * @property {string} url - The page URL
 * @property {string} content - The cleaned page content
 * @property {number} tokenCount - Number of tokens in content
 * @property {boolean} truncated - Whether content was truncated
 */

/**
 * Gets page content from the active tab.
 * Logs errors to console and returns fallback message instead of throwing.
 * @returns {Promise<PageContent>} The page content or fallback
 */
export async function getPageContent() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        console.warn('[Page Extractor] No active tab found');
        resolve(createFallbackContent());
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTENT' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Page Extractor] Error getting page content:', chrome.runtime.lastError.message);
          resolve(createFallbackContent());
          return;
        }

        if (!response || response.error) {
          console.warn('[Page Extractor] Invalid response:', response?.error);
          resolve(createFallbackContent());
          return;
        }

        resolve(processPageContent(response));
      });
    });
  });
}

/**
 * Creates fallback content when page extraction fails.
 * @returns {PageContent} Fallback page content
 */
function createFallbackContent() {
  return {
    title: '',
    url: '',
    content: UNAVAILABLE_MESSAGE,
    tokenCount: 0,
    truncated: false
  };
}

/**
 * Processes raw page content into a cleaned format.
 * Uses token-based truncation for accurate context window management.
 * @param {Object} raw - Raw content from content script
 * @returns {PageContent} Processed page content
 */
function processPageContent(raw) {
  const { title = '', url = '', textContent = '' } = raw;

  // Use pre-cleaned textContent from content script
  const originalTokens = countTokens(textContent);
  console.log(`[Page Extractor] Original token count: ${originalTokens}`);

  const { text: content, tokenCount, truncated } = truncateToTokens(textContent, MAX_PAGE_TOKENS);

  if (truncated) {
    console.log(`[Page Extractor] Truncated from ${originalTokens} to ${tokenCount} tokens`);
  }

  return {
    title,
    url,
    content,
    tokenCount,
    truncated
  };
}

/**
 * Formats page content for inclusion in a prompt.
 * @param {PageContent} pageContent - The page content
 * @returns {string} Formatted context string
 */
export function formatPageContext(pageContent) {
  if (!pageContent || !pageContent.content) {
    return '';
  }

  // Return as-is if it's the fallback message
  if (pageContent.content === UNAVAILABLE_MESSAGE) {
    return UNAVAILABLE_MESSAGE;
  }

  const parts = [];

  if (pageContent.title) {
    parts.push(`Page Title: ${pageContent.title}`);
  }

  if (pageContent.url) {
    parts.push(`URL: ${pageContent.url}`);
  }

  parts.push(`\nPage Content:\n${pageContent.content}`);

  if (pageContent.truncated) {
    parts.push(`\n[Content truncated to ${MAX_PAGE_TOKENS} tokens]`);
  }

  return parts.join('\n');
}

// Legacy export for backwards compatibility
export const getCurrentPageContent = getPageContent;
