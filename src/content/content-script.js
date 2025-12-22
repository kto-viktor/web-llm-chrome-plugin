/**
 * Content script for extracting page content.
 * Runs in the context of web pages.
 * @module content/content-script
 */

(function() {
  'use strict';

  /**
   * Elements that should be completely removed.
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
   * Extracts clean text content from the page.
   * @returns {string} Cleaned text content
   */
  function extractTextContent() {
    const clone = document.body.cloneNode(true);

    const allTags = [...REMOVE_ELEMENTS, ...SKIP_ELEMENTS];
    for (const tag of allTags) {
      const elements = clone.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    }

    const text = clone.textContent || clone.innerText || '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Gets page metadata.
   * @returns {Object} Page metadata
   */
  function getPageMetadata() {
    return {
      title: document.title || '',
      url: window.location.href,
      html: document.body ? document.body.innerHTML : ''
    };
  }

  /**
   * Handles messages from the sidebar.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXTRACT_PAGE_CONTENT') {
      try {
        const metadata = getPageMetadata();
        const content = extractTextContent();

        sendResponse({
          title: metadata.title,
          url: metadata.url,
          html: metadata.html,
          textContent: content,
          success: true
        });
      } catch (error) {
        sendResponse({
          error: error.message,
          success: false
        });
      }
    }

    return true;
  });

  /**
   * Notifies that content script is ready.
   */
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });

})();
