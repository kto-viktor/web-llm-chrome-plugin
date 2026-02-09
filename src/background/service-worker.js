/**
 * Background service worker for Offline GPT extension.
 * Handles extension lifecycle and coordinates messaging.
 * @module background/service-worker
 */

/**
 * Injects content script into a specific tab.
 * @param {number} tabId - The tab ID to inject the script into
 */
function injectContentScript(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['src/content/content-script.js']
  }).catch(error => {
    // Silently ignore injection errors (e.g., chrome:// pages)
    console.debug('Could not inject content script into tab:', tabId, error.message);
  });
}

/**
 * Injects content script into all existing tabs when extension is installed.
 * This ensures tabs opened before installation also get the content script.
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
    for (const tab of tabs) {
      injectContentScript(tab.id);
    }
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Code to be executed on first install
    // eg. open a tab with a url
    chrome.tabs.create({
      url: "https://local-llm-run.github.io/",
    });
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // When extension is updated
  } else if (
      details.reason === chrome.runtime.OnInstalledReason.CHROME_UPDATE
  ) {
    // When browser is updated
  } else if (
      details.reason === chrome.runtime.OnInstalledReason.SHARED_MODULE_UPDATE
  ) {
    // When a shared module is updated
  }
});

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
    // Notify sidebar to clear and reload attachment
    chrome.runtime.sendMessage({
      type: 'CLEAR_ATTACHMENT',
      tabId: sender.tab?.id
    }).catch(() => {
      // Sidebar might not be open, ignore error
    });
  }

  return false;
});

console.log('Offline GPT service worker initialized');
