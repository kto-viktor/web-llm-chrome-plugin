/**
 * Service for extracting and cleaning page content.
 * @module services/page-extractor
 */

import { extractReadableText } from '../utils/html-cleaner.js';
import { truncateToWords, countWords } from '../utils/text-utils.js';

/**
 * Maximum words to include from page content.
 */
const MAX_PAGE_WORDS = 3000;

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
 * Requests page content from the content script.
 * @param {number} tabId - The tab ID to extract from
 * @returns {Promise<PageContent>} The extracted page content
 */
export async function extractPageContent(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_PAGE_CONTENT' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response || response.error) {
        reject(new Error(response?.error || 'Failed to extract page content'));
        return;
      }

      resolve(processPageContent(response));
    });
  });
}

/**
 * Processes raw page content into a cleaned format.
 * @param {Object} raw - Raw content from content script
 * @returns {PageContent} Processed page content
 */
export function processPageContent(raw) {
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

/**
 * Gets the current active tab's page content.
 * @returns {Promise<PageContent>} The page content
 */
export async function getCurrentPageContent() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || tabs.length === 0) {
        reject(new Error('No active tab found'));
        return;
      }

      try {
        const content = await extractPageContent(tabs[0].id);
        resolve(content);
      } catch (error) {
        reject(error);
      }
    });
  });
}
