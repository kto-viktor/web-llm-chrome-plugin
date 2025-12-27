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
 * Updates the model status display.
 * @param {Object} state - The LLM state
 */
function updateStatusDisplay(state) {
  const { status, displayName, error, downloadProgress, downloadText } = state;

  elements.statusIndicator.className = 'status-indicator';
  elements.downloadSection.classList.add('hidden');
  elements.errorSection.classList.add('hidden');

  switch (status) {
    case 'detecting':
      elements.statusText.textContent = 'Detecting available models...';
      break;

    case 'downloading':
      elements.statusIndicator.classList.add('downloading');
      elements.statusText.textContent = displayName || 'Downloading model...';
      elements.downloadSection.classList.remove('hidden');
      elements.downloadInfo.textContent = downloadText || 'Downloading...';
      elements.progressFill.style.width = `${(downloadProgress * 100).toFixed(1)}%`;
      break;

    case 'ready':
      elements.statusIndicator.classList.add('ready');
      elements.statusText.textContent = displayName || 'Ready';
      setInputEnabled(true);
      break;

    case 'error':
      elements.statusIndicator.classList.add('error');
      elements.statusText.textContent = 'Error';
      elements.errorSection.classList.remove('hidden');
      elements.errorMessage.textContent = error || 'Unknown error occurred';
      setInputEnabled(false);
      break;

    default:
      elements.statusText.textContent = 'Initializing...';
  }
}

/**
 * Enables or disables input controls.
 * @param {boolean} enabled - Whether to enable inputs
 */
function setInputEnabled(enabled) {
  elements.messageInput.disabled = !enabled;
  elements.sendBtn.disabled = !enabled;
  elements.summaryBtn.disabled = !enabled;
  elements.clearBtn.disabled = !enabled;
  elements.modelSelector.disabled = !enabled;
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
 */
async function handleModelChange() {
  const selectedModel = elements.modelSelector.value;
  console.log(`[Sidebar] User selected model: ${selectedModel}`);

  setInputEnabled(false);

  try {
    await llm.switchModel(selectedModel);
  } catch (error) {
    console.error('[Sidebar] Model switch failed:', error);
  }
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
