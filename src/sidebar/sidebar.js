/**
 * Sidebar UI controller.
 * Handles user interactions and displays chat messages.
 * @module sidebar/sidebar
 */

console.log('=== Offline GPT Sidebar Loading ===');

import { llm } from '../core/llm-interface.js';
import { chatService } from '../services/chat-service.js';
import { historyManager } from '../services/history-manager.js';
import { getPageContent } from '../services/page-extractor.js';
import { formatResponse } from '../utils/response-formatter.js';

console.log('[Sidebar] Modules imported successfully');

/**
 * DOM element references.
 */
const elements = {
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
  modelSelector: document.getElementById('model-selector'),
  downloadSection: document.getElementById('download-section'),
  downloadInfo: document.getElementById('download-info'),
  progressFill: document.getElementById('progress-fill'),
  errorSection: document.getElementById('error-section'),
  errorMessage: document.getElementById('error-message'),
  geminiSetupSection: document.getElementById('gemini-setup-section'),
  geminiSetupDismiss: document.getElementById('gemini-setup-dismiss'),
  attachmentSection: document.getElementById('attachment-section'),
  attachmentTitle: document.getElementById('attachment-title'),
  attachmentRemove: document.getElementById('attachment-remove'),
  messagesContainer: document.getElementById('messages-container'),
  messages: document.getElementById('messages'),
  thinkingIndicator: document.getElementById('thinking-indicator'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  summaryBtn: document.getElementById('summary-btn'),
  clearBtn: document.getElementById('clear-btn')
};

/**
 * Current page attachment state.
 * @type {Object|null}
 */
let currentAttachment = null;

/**
 * Tracks the model currently selected in dropdown for preview.
 * May differ from the model being downloaded.
 * @type {string|null}
 */
let previewSelectedModel = null;

/**
 * Whether a download is currently in progress.
 * @type {boolean}
 */
let isDownloading = false;

/**
 * Updates the model status display.
 * Handles both the actual LLM state and preview selection during downloads.
 * @param {Object} state - The LLM state
 */
function updateStatusDisplay(state) {
  const { status, displayName, error, downloadProgress, downloadText, modelName } = state;

  elements.statusIndicator.className = 'status-indicator';
  elements.errorSection.classList.add('hidden');

  // Track download state
  isDownloading = (status === 'downloading');

  // Always show download progress if downloading (regardless of preview selection)
  if (status === 'downloading') {
    elements.downloadSection.classList.remove('hidden');
    elements.downloadInfo.textContent = downloadText || 'Downloading...';
    elements.progressFill.style.width = `${(downloadProgress * 100).toFixed(1)}%`;
    elements.statusIndicator.classList.add('downloading');
    elements.statusText.textContent = displayName || 'Downloading model...';
  } else {
    elements.downloadSection.classList.add('hidden');
  }

  // Show Gemini setup if Gemini is selected in dropdown (preview) while downloading another model
  // OR if Gemini is unavailable when actually trying to use it
  const dropdownValue = elements.modelSelector.value;
  const isGeminiPreviewDuringDownload = isDownloading && dropdownValue === 'gemini-nano' && modelName !== 'gemini-nano';
  const isGeminiUnavailable = status === 'gemini-unavailable';

  if (isGeminiPreviewDuringDownload || isGeminiUnavailable) {
    elements.geminiSetupSection.classList.remove('hidden');
  } else {
    elements.geminiSetupSection.classList.add('hidden');
  }

  switch (status) {
    case 'detecting':
      elements.statusText.textContent = 'Detecting available models...';
      setInputEnabled(false);
      break;

    case 'downloading':
      // Already handled above, just disable chat input
      setInputEnabled(false);
      break;

    case 'ready':
      elements.statusIndicator.classList.add('ready');
      elements.statusText.textContent = displayName || 'Ready';
      setInputEnabled(true);
      // Sync selector with active model and clear preview
      if (modelName) {
        elements.modelSelector.value = modelName;
        previewSelectedModel = null;
      }
      break;

    case 'error':
      elements.statusIndicator.classList.add('error');
      elements.statusText.textContent = 'Error';
      elements.errorSection.classList.remove('hidden');
      elements.errorMessage.textContent = error || 'Unknown error occurred';
      setInputEnabled(false);
      break;

    case 'gemini-unavailable':
      elements.statusIndicator.classList.add('error');
      elements.statusText.textContent = 'Gemini Nano unavailable';
      setInputEnabled(false);
      break;

    default:
      elements.statusText.textContent = 'Initializing...';
  }
}

/**
 * Enables or disables chat input controls (not the model selector).
 * Model selector remains enabled to allow browsing models at any time.
 * @param {boolean} enabled - Whether to enable inputs
 */
function setInputEnabled(enabled) {
  elements.messageInput.disabled = !enabled;
  elements.sendBtn.disabled = !enabled;
  elements.summaryBtn.disabled = !enabled;
  elements.clearBtn.disabled = !enabled;
  // Model selector is NOT disabled here - always allow browsing models
}

/**
 * Loads page content and displays as attachment.
 */
async function loadPageAttachment() {
  try {
    const pageContent = await getPageContent();
    console.log('[Sidebar] Page content received:', pageContent);

    // Check if we have valid page content (not the fallback message)
    const hasValidContent = pageContent &&
        pageContent.content &&
        !pageContent.content.includes('not available');

    if (hasValidContent) {
      currentAttachment = pageContent;
      elements.attachmentTitle.textContent = pageContent.title || 'Current Page';
      elements.attachmentSection.classList.remove('hidden');
      console.log('[Sidebar] Page attachment loaded:', pageContent.title);
    } else {
      currentAttachment = null;
      elements.attachmentSection.classList.add('hidden');
      console.log('[Sidebar] No valid page content for attachment');
    }
  } catch (error) {
    console.warn('[Sidebar] Failed to load page attachment:', error);
    currentAttachment = null;
    elements.attachmentSection.classList.add('hidden');
  }
}

/**
 * Removes the current page attachment.
 */
function removeAttachment() {
  currentAttachment = null;
  elements.attachmentSection.classList.add('hidden');
  console.log('[Sidebar] Attachment removed');
}

/**
 * Renders a message in the chat.
 * @param {Object} message - The message object
 * @param {boolean} [isGenerating=false] - Whether this is a generating message
 * @returns {HTMLElement} The message element
 */
function renderMessage(message, isGenerating = false) {
  const div = document.createElement('div');
  div.className = `message ${message.role}${isGenerating ? ' generating' : ''}`;

  // Show attachment if present
  if (message.attachment) {
    const attachmentDiv = document.createElement('div');
    attachmentDiv.className = 'message-attachment';
    attachmentDiv.innerHTML = `
      <span class="message-attachment-icon">📄</span>
      <span class="message-attachment-title">${message.attachment.title || 'Page'}</span>
    `;
    div.appendChild(attachmentDiv);
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  // Format assistant messages with markdown, keep user messages as plain text
  if (message.role === 'assistant' && !isGenerating) {
    contentDiv.innerHTML = formatResponse(message.content);
  } else {
    contentDiv.textContent = message.content;
  }

  div.appendChild(contentDiv);

  return div;
}

/**
 * Renders all messages from history.
 */
function renderMessages() {
  const messages = historyManager.getMessages();

  elements.messages.innerHTML = '';

  if (messages.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">💬</div>
      <div class="empty-state-text">Ask a question about this page</div>
    `;
    elements.messages.appendChild(emptyState);
    return;
  }

  messages.forEach(msg => {
    elements.messages.appendChild(renderMessage(msg));
  });

  scrollToBottom();
}

/**
 * Scrolls the messages container to the bottom.
 */
function scrollToBottom() {
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

/**
 * Handles sending a message.
 */
async function handleSendMessage() {
  const message = elements.messageInput.value.trim();

  if (!message || !llm.isReady()) {
    return;
  }

  elements.messageInput.value = '';
  autoResizeTextarea();

  // Capture attachment before clearing
  const attachment = currentAttachment;

  const userMsgEl = renderMessage({ role: 'user', content: message, attachment });
  elements.messages.appendChild(userMsgEl);

  elements.thinkingIndicator.classList.remove('hidden');
  const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'message assistant generating';
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  assistantMsgEl.appendChild(contentDiv);
  elements.messages.appendChild(assistantMsgEl);
  scrollToBottom();

  setInputEnabled(false);

  // Clear attachment after capturing
  currentAttachment = null;
  elements.attachmentSection.classList.add('hidden');

  let fullResponse = '';

  try {
    await chatService.sendMessage(message, {
      attachment,
      onToken: (token) => {
        elements.thinkingIndicator.classList.add('hidden');
        fullResponse += token;
        contentDiv.textContent = fullResponse;
        scrollToBottom();
      }
    });

    // Format complete response with markdown
    assistantMsgEl.classList.remove('generating');
    contentDiv.innerHTML = formatResponse(fullResponse);
  } catch (error) {
    const errorMsg = error?.message || String(error) || 'Unknown error';
    await historyManager.addMessage('assistant', `Error: ${errorMsg}`);
  } finally {
    setInputEnabled(true);
    elements.messageInput.focus();
    // Reload attachment for next message
    loadPageAttachment();
  }
}

/**
 * Handles the page summary button.
 */
async function handlePageSummary() {
  if (!llm.isReady()) {
    return;
  }

  // Capture attachment before clearing
  const attachment = currentAttachment;

  const userMsgEl = renderMessage({ role: 'user', content: 'Give a summary of this page.', attachment });
  elements.messages.appendChild(userMsgEl);

  elements.thinkingIndicator.classList.remove('hidden');

    const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'message assistant generating';
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  assistantMsgEl.appendChild(contentDiv);
  elements.messages.appendChild(assistantMsgEl);
  scrollToBottom();

  setInputEnabled(false);

  // Clear attachment after capturing
  currentAttachment = null;
  elements.attachmentSection.classList.add('hidden');

  let fullResponse = '';

  try {
    await chatService.requestPageSummary(attachment, (token) => {
      elements.thinkingIndicator.classList.add('hidden');
      fullResponse += token;
      contentDiv.textContent = fullResponse;
      scrollToBottom();
    });

    // Format complete response with markdown
    assistantMsgEl.classList.remove('generating');
    contentDiv.innerHTML = formatResponse(fullResponse);
  } catch (error) {
    const errorMsg = error?.message || String(error) || 'Unknown error';
    await historyManager.addMessage('assistant', `Error: ${errorMsg}`);
  } finally {
    setInputEnabled(true);
    elements.messageInput.focus();
    // Reload attachment for next message
    loadPageAttachment();
  }
}

/**
 * Handles clearing the chat history.
 */
async function handleClearHistory() {
  await chatService.clearHistory();
  renderMessages();
}

/**
 * Handles model selection change.
 * During download: shows preview info without cancelling download.
 * When not downloading: actually switches to the selected model.
 */
async function handleModelChange() {
  const selectedModel = elements.modelSelector.value;
  console.log(`[Sidebar] User selected model: ${selectedModel}`);

  // If downloading, just show preview info without switching
  if (isDownloading) {
    previewSelectedModel = selectedModel;
    console.log(`[Sidebar] Preview selection during download: ${selectedModel}`);

    // Show/hide Gemini setup based on preview selection
    if (selectedModel === 'gemini-nano') {
      elements.geminiSetupSection.classList.remove('hidden');
    } else {
      elements.geminiSetupSection.classList.add('hidden');
    }
    return;
  }

  // Not downloading - actually switch the model
  previewSelectedModel = null;

  try {
    await llm.switchModel(selectedModel);
  } catch (error) {
    console.error('[Sidebar] Model switch failed:', error);
  }
}

/**
 * Handles clicking on chrome:// links.
 * Copies the URL to clipboard since chrome:// URLs can't be opened directly.
 * @param {Event} event - The click event
 */
async function handleChromeLink(event) {
  event.preventDefault();
  const url = event.target.dataset.url;
  if (!url) return;

  try {
    await navigator.clipboard.writeText(url);
    const originalText = event.target.textContent;
    event.target.textContent = 'Copied!';
    event.target.style.background = 'rgba(15, 157, 88, 0.2)';
    setTimeout(() => {
      event.target.textContent = originalText;
      event.target.style.background = '';
    }, 1500);
  } catch (error) {
    console.error('[Sidebar] Failed to copy URL:', error);
  }
}

/**
 * Handles dismissing the Gemini Nano setup instructions.
 * During download: just hides setup and reverts dropdown to downloading model.
 * When not downloading: switches to Qwen model.
 */
async function handleGeminiSetupDismiss() {
  elements.geminiSetupSection.classList.add('hidden');

  // If downloading, just revert dropdown to the model being downloaded
  if (isDownloading) {
    const currentState = llm.getState();
    if (currentState.modelName) {
      elements.modelSelector.value = currentState.modelName;
    }
    previewSelectedModel = null;
    return;
  }

  // Not downloading - switch to Qwen model
  elements.modelSelector.value = 'webllm-qwen';
  await llm.switchModel('webllm-qwen');
}

/**
 * Auto-resizes the textarea based on content.
 */
function autoResizeTextarea() {
  const textarea = elements.messageInput;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

/**
 * Sets up event listeners.
 */
function setupEventListeners() {
  elements.sendBtn.addEventListener('click', handleSendMessage);

  elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  elements.messageInput.addEventListener('input', autoResizeTextarea);

  elements.summaryBtn.addEventListener('click', handlePageSummary);

  elements.clearBtn.addEventListener('click', handleClearHistory);

  elements.modelSelector.addEventListener('change', handleModelChange);

  elements.attachmentRemove.addEventListener('click', removeAttachment);

  // Gemini Nano setup section handlers
  elements.geminiSetupDismiss.addEventListener('click', handleGeminiSetupDismiss);

  // Handle chrome:// link clicks
  document.querySelectorAll('.chrome-link').forEach(link => {
    link.addEventListener('click', handleChromeLink);
  });

  // Listen for tab changes to refresh attachment
  chrome.tabs.onActivated.addListener(() => {
    console.log('[Sidebar] Tab changed, reloading attachment...');
    loadPageAttachment();
  });

  // Listen for tab URL changes (navigation within same tab)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      console.log('[Sidebar] Tab updated, reloading attachment...');
      loadPageAttachment();
    }
  });
}

/**
 * Initializes the sidebar.
 */
async function initialize() {
  console.log('[Sidebar] Starting initialization...');
  setInputEnabled(false);
  setupEventListeners();

  llm.subscribe(updateStatusDisplay);
  historyManager.subscribe(renderMessages);

  try {
    console.log('[Sidebar] Initializing chat service...');
    await chatService.initialize();

    console.log('[Sidebar] Loading page attachment...');
    await loadPageAttachment();

    console.log('[Sidebar] Initializing LLM (detecting models)...');
    await llm.initialize();

    console.log('[Sidebar] Initialization complete!');
  } catch (error) {
    console.error('[Sidebar] Initialization error:', error);
  }
}

console.log('[Sidebar] Calling initialize()...');
initialize();
