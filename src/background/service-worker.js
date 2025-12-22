/**
 * Background service worker for Offline GPT extension.
 * Handles extension lifecycle and coordinates messaging.
 * @module background/service-worker
 */

/**
 * Opens the side panel when the extension icon is clicked.
 */
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

/**
 * Sets up the side panel behavior.
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set panel behavior:', error));

/**
 * Handles messages from content scripts and sidebar.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_SCRIPT_READY') {
    console.log('Content script ready on tab:', sender.tab?.id);
  }

  return false;
});

/**
 * Injects content script when a tab is updated.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:')) {
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/content-script.js']
      });
    } catch (error) {
      // Script may already be injected or page doesn't allow scripts
      console.debug('Script injection skipped for tab:', tabId);
    }
  }
});

console.log('Offline GPT service worker initialized');
