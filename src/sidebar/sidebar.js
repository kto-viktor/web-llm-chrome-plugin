/**
 * Sidebar UI controller.
 * Handles user interactions and displays chat messages.
 * @module sidebar/sidebar
 */

console.log('=== Offline GPT Sidebar Loading ===');

import { llm } from '../core/llm-interface.js';
import { chatService } from '../services/chat-service.js';
import { historyManager } from '../services/history-manager.js';

console.log('[Sidebar] Modules imported successfully');

/**
 * DOM element references.
 */
const elements = {
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
  downloadSection: document.getElementById('download-section'),
  downloadInfo: document.getElementById('download-info'),
  progressFill: document.getElementById('progress-fill'),
  errorSection: document.getElementById('error-section'),
  errorMessage: document.getElementById('error-message'),
  messagesContainer: document.getElementById('messages-container'),
  messages: document.getElementById('messages'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  summaryBtn: document.getElementById('summary-btn'),
  clearBtn: document.getElementById('clear-btn')
};

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
  div.textContent = message.content;
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

  const userMsgEl = renderMessage({ role: 'user', content: message });
  elements.messages.appendChild(userMsgEl);

  const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'message assistant generating';
  elements.messages.appendChild(assistantMsgEl);
  scrollToBottom();

  setInputEnabled(false);

  try {
    await chatService.sendMessage(message, {
      onToken: (token) => {
        assistantMsgEl.textContent += token;
        scrollToBottom();
      }
    });

    assistantMsgEl.classList.remove('generating');
  } catch (error) {
    const errorMsg = error?.message || String(error) || 'Unknown error';
    await historyManager.addMessage('assistant', `Error: ${errorMsg}`);
  } finally {
    setInputEnabled(true);
    elements.messageInput.focus();
  }
}

/**
 * Handles the page summary button.
 */
async function handlePageSummary() {
  if (!llm.isReady()) {
    return;
  }

  const userMsgEl = renderMessage({ role: 'user', content: 'Give a summary of this page.' });
  elements.messages.appendChild(userMsgEl);

  const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'message assistant generating';
  elements.messages.appendChild(assistantMsgEl);
  scrollToBottom();

  setInputEnabled(false);

  try {
    await chatService.requestPageSummary((token) => {
      assistantMsgEl.textContent += token;
      scrollToBottom();
    });

    assistantMsgEl.classList.remove('generating');
  } catch (error) {
    const errorMsg = error?.message || String(error) || 'Unknown error';
    await historyManager.addMessage('assistant', `Error: ${errorMsg}`);
  } finally {
    setInputEnabled(true);
    elements.messageInput.focus();
  }
}

/**
 * Handles clearing the chat history.
 */
async function handleClearHistory() {
  if (confirm('Clear all chat history?')) {
    await chatService.clearHistory();
    renderMessages();
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

    console.log('[Sidebar] Initializing LLM (detecting models)...');
    await llm.initialize();

    console.log('[Sidebar] Initialization complete!');
  } catch (error) {
    console.error('[Sidebar] Initialization error:', error);
  }
}

console.log('[Sidebar] Calling initialize()...');
initialize();
