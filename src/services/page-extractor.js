/**
 * Service for extracting page content from the active tab.
 * @module services/page-extractor
 */

import { extractReadableText } from '../utils/html-cleaner.js';
import { truncateToWords, countWords } from '../utils/text-utils.js';

/**
 * Maximum words to include from page content.
 */
const MAX_PAGE_WORDS = 3000;

/**
 * Fallback message when page content is unavailable.
 */
// TODO: seems to be not used, because overridden in downstream code - need to rewrite downstream code to use this message
const UNAVAILABLE_MESSAGE = 'Page content is not available. If you need it, ask user to refresh the page';

/**
 * Extracted page content.
 * @typedef {Object} PageContent
 * @property {string} title - The page title
 * @property {string} url - The page URL
 * @property {string} content - The cleaned page content
 * @property {number} wordCount - Number of words in content
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
    wordCount: 0,
    truncated: false
  };
}

/**
 * Processes raw page content into a cleaned format.
 * @param {Object} raw - Raw content from content script
 * @returns {PageContent} Processed page content
 */
function processPageContent(raw) {
  const { title = '', url = '', html = '' } = raw;

  let content = extractReadableText(html);
  const originalWordCount = countWords(content);
  let truncated = false;

  if (originalWordCount > MAX_PAGE_WORDS) {
    content = truncateToWords(content, MAX_PAGE_WORDS);
    truncated = true;
  }

  return {
    title,
    url,
    content,
    wordCount: countWords(content),
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
    parts.push('\n[Content truncated to 3000 words]');
  }

  return parts.join('\n');
}

// Legacy export for backwards compatibility
export const getCurrentPageContent = getPageContent;
