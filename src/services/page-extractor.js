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
const UNAVAILABLE_MESSAGE = 'Page content is not available.';

/**
 * Elements that should be completely removed during extraction.
 */
const REMOVE_ELEMENTS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'video', 'audio', 'embed', 'object', 'template', 'head'
];

/**
 * Elements that typically don't contain main content.
 */
const SKIP_ELEMENTS = [
  'nav', 'footer', 'header', 'aside', 'menu', 'menuitem'
];

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
 * Extracts page content directly using chrome.scripting API.
 * Used as fallback when content script is not available.
 * @param {number} tabId - The tab ID to extract content from
 * @returns {Promise<Object|null>} Extracted content or null on failure
 */
async function extractViaScriptingAPI(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (removeElements, skipElements) => {
        const clone = document.body.cloneNode(true);
        const allTags = [...removeElements, ...skipElements];
        for (const tag of allTags) {
          const elements = clone.querySelectorAll(tag);
          elements.forEach(el => el.remove());
        }
        const text = clone.textContent || clone.innerText || '';
        const textContent = text
          .replace(/\s+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        return {
          title: document.title || '',
          url: window.location.href,
          html: document.body ? document.body.innerHTML : '',
          textContent: textContent,
          success: true
        };
      },
      args: [REMOVE_ELEMENTS, SKIP_ELEMENTS]
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    return null;
  } catch (error) {
    console.warn('[Page Extractor] Scripting API extraction failed:', error.message);
    return null;
  }
}

/**
 * Gets page content from the active tab.
 * First tries via content script message, falls back to scripting API.
 * @returns {Promise<PageContent>} The page content or fallback
 */
export async function getPageContent() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        console.warn('[Page Extractor] No active tab found');
        resolve(createFallbackContent());
        return;
      }

      const tabId = tabs[0].id;

      // Try content script first
      chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTENT' }, async (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
          console.log('[Page Extractor] Content script unavailable, using scripting API fallback');

          // Fallback to scripting API for tabs opened before extension install
          const scriptResult = await extractViaScriptingAPI(tabId);
          if (scriptResult) {
            resolve(processPageContent(scriptResult));
          } else {
            resolve(createFallbackContent());
          }
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
