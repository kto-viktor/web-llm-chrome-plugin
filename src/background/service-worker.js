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

console.log('Offline GPT service worker initialized');
