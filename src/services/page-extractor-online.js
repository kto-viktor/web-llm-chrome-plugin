/**
 * Page extractor for online mode.
 *
 * Runs Mozilla Readability against the active tab's HTML to pull the main
 * article. The sidebar lives in its own document, so we hop into the tab via
 * chrome.scripting.executeScript, grab `document.documentElement.outerHTML`,
 * parse it back in the sidebar with DOMParser, and run Readability there.
 *
 * Why this split: Readability ships as ESM and is bundled into the sidebar.
 * Injecting it into the page context would mean re-bundling it as a content
 * script with a different module shape — not worth it for one read.
 *
 * @module services/page-extractor-online
 */

import { Readability } from '@mozilla/readability';

/**
 * @typedef {Object} ExtractedPage
 * @property {string} title    - Best-effort page title
 * @property {string} url      - Page URL
 * @property {string} byline   - Author / byline if Readability found one
 * @property {string} content  - Plain-text main content (markdown-ish)
 * @property {number} length   - Length in characters of `content`
 */

/**
 * Extracts the main content of the user's currently active tab.
 *
 * Throws on permission errors or unparseable pages — callers should surface a
 * friendly message and let the user proceed without an attachment.
 *
 * @returns {Promise<ExtractedPage>}
 */
export async function extractActivePage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error('No active tab');
  }
  if (/^chrome(-extension)?:\/\//.test(tab.url) || /^about:/.test(tab.url)) {
    throw new Error('Cannot read browser-internal pages');
  }

  const [{ result: html } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.documentElement.outerHTML,
  });

  if (!html || typeof html !== 'string') {
    throw new Error('Could not read page HTML');
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Readability mutates the document; clone semantics not required since we
  // already have a fresh parse.
  const article = new Readability(doc).parse();

  if (!article || !article.textContent) {
    throw new Error('No main content detected on this page');
  }

  const content = article.textContent.trim();
  return {
    title: article.title || tab.title || tab.url,
    url: tab.url,
    byline: article.byline || '',
    content,
    length: content.length,
  };
}
