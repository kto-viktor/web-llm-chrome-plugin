/**
 * Chat service that orchestrates AI conversations with page context.
 * @module services/chat-service
 */

import { llm } from '../core/llm-interface.js';
import { historyManager } from './history-manager.js';
import { getCurrentPageContent, formatPageContext } from './page-extractor.js';

/**
 * Chat state.
 * @typedef {Object} ChatState
 * @property {boolean} isGenerating
 * @property {string|null} currentResponse
 * @property {Object|null} pageContent
 * @property {string|null} error
 */

/**
 * Chat service for managing AI conversations.
 */
export class ChatService {
  constructor() {
    /** @type {ChatState} */
    this.state = {
      isGenerating: false,
      currentResponse: null,
      pageContent: null,
      error: null
    };

    /** @type {Set<Function>} */
    this.listeners = new Set();
  }

  /**
   * Subscribes to state changes.
   * @param {Function} listener - Callback receiving the new state
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Updates state and notifies listeners.
   * @param {Partial<ChatState>} updates - State updates
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Initializes the chat service.
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('[Chat Service] Initializing...');
    await historyManager.load();
    console.log('[Chat Service] Initialized');
  }

  /**
   * Loads current page content.
   * @returns {Promise<void>}
   */
  async loadPageContent() {
    console.log('[Chat Service] Loading page content...');
    try {
      const content = await getCurrentPageContent();
      this.updateState({ pageContent: content, error: null });
      console.log(`[Chat Service] Page loaded: "${content.title}" (${content.wordCount} words, truncated: ${content.truncated})`);
    } catch (error) {
      console.error('[Chat Service] Failed to load page:', error.message);
      this.updateState({
        pageContent: null,
        error: `Could not load page: ${error.message}`
      });
    }
  }

  /**
   * Builds the full prompt with context.
   * @param {string} userMessage - The user's message
   * @param {boolean} includePageContext - Whether to include page context
   * @returns {string} The complete prompt
   */
  buildPrompt(userMessage, includePageContext = true) {
    const parts = [];

    if (includePageContext && this.state.pageContent) {
      const pageContext = formatPageContext(this.state.pageContent);
      parts.push(`[Current Page Context]\n${pageContext}\n[End Page Context]\n`);
    }

    const historyText = historyManager.formatForPrompt();
    if (historyText) {
      parts.push(`[Conversation History]\n${historyText}\n[End History]\n`);
    }

    parts.push(`User: ${userMessage}`);

    return parts.join('\n');
  }

  /**
   * Sends a message and gets a response.
   * @param {string} message - The user's message
   * @param {Object} [options] - Options
   * @param {boolean} [options.includePageContext=true] - Include page context
   * @param {Function} [options.onToken] - Streaming token callback
   * @returns {Promise<string>} The assistant's response
   */
  async sendMessage(message, options = {}) {
    const { includePageContext = true, onToken } = options;

    console.log(`[Chat Service] Sending message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    console.log(`[Chat Service] Options: includePageContext=${includePageContext}`);

    if (this.state.isGenerating) {
      console.warn('[Chat Service] Already generating, rejecting new message');
      throw new Error('Already generating a response');
    }

    this.updateState({ isGenerating: true, currentResponse: '', error: null });

    try {
      console.log('[Chat Service] Adding user message to history...');
      await historyManager.addMessage('user', message);

      if (historyManager.needsCompaction()) {
        console.log('[Chat Service] History needs compaction, compacting...');
        await this.compactHistory();
      }

      const prompt = this.buildPrompt(message, includePageContext);
      console.log(`[Chat Service] Built prompt (${prompt.length} chars)`);

      console.log('[Chat Service] Generating response...');
      const response = await llm.generate(prompt, {
        onToken: (token) => {
          this.updateState({
            currentResponse: (this.state.currentResponse || '') + token
          });
          if (onToken) onToken(token);
        }
      });

      console.log(`[Chat Service] Response received (${response.length} chars)`);
      console.log('[Chat Service] Adding assistant message to history...');
      await historyManager.addMessage('assistant', response);

      this.updateState({ isGenerating: false, currentResponse: null });
      console.log('[Chat Service] Message exchange complete');

      return response;
    } catch (error) {
      console.error('[Chat Service] Message failed:', error.message);
      this.updateState({
        isGenerating: false,
        currentResponse: null,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sends a page summary request.
   * Uses native Summarizer API if available, otherwise uses chat.
   * @param {Function} [onToken] - Streaming token callback
   * @returns {Promise<string>} The summary
   */
  async requestPageSummary(onToken) {
    // If we have page content and Summarizer is available, use it directly
    if (this.state.pageContent?.content && llm.isSummarizerAvailable()) {
      console.log('[Chat Service] Using Summarizer API for page summary');

      this.updateState({ isGenerating: true, currentResponse: '', error: null });

      try {
        // Add user message to history
        await historyManager.addMessage('user', 'Give a summary of this page.');

        // Use Summarizer API
        const summary = await llm.summarize(this.state.pageContent.content, {
          onToken: (token) => {
            this.updateState({
              currentResponse: (this.state.currentResponse || '') + token
            });
            if (onToken) onToken(token);
          }
        });

        // Add assistant response to history
        await historyManager.addMessage('assistant', summary);

        this.updateState({ isGenerating: false, currentResponse: null });
        return summary;
      } catch (error) {
        console.warn('[Chat Service] Summarizer failed, falling back to chat:', error.message);
        this.updateState({ isGenerating: false, currentResponse: null });
        // Fall through to chat-based summary
      }
    }

    // Fallback to chat-based summary
    console.log('[Chat Service] Using chat for page summary');
    return this.sendMessage('Give a summary of this page.', {
      includePageContext: true,
      onToken
    });
  }

  /**
   * Compacts conversation history.
   * Uses Summarizer API if available, otherwise uses prompt-based.
   * @returns {Promise<void>}
   */
  async compactHistory() {
    const historyText = historyManager.formatForPrompt();

    if (!historyText) {
      return;
    }

    console.log('[Chat Service] Compacting history...');

    // Use the unified summarize method (automatically uses Summarizer or prompt)
    const summary = await llm.summarize(historyText);

    // Update history with compacted summary
    historyManager.messages = [{
      role: 'assistant',
      content: `[Previous conversation summary: ${summary}]`,
      timestamp: Date.now()
    }];

    await historyManager.save();
    historyManager.notifyListeners();

    console.log('[Chat Service] History compacted');
  }

  /**
   * Clears conversation history.
   * @returns {Promise<void>}
   */
  async clearHistory() {
    console.log('[Chat Service] Clearing history...');
    await historyManager.clear();
    console.log('[Chat Service] History cleared');
  }

  /**
   * Gets the conversation history.
   * @returns {Array} The messages
   */
  getHistory() {
    return historyManager.getMessages();
  }

  /**
   * Gets the current state.
   * @returns {ChatState} The current state
   */
  getState() {
    return this.state;
  }
}

/**
 * Singleton instance of the chat service.
 */
export const chatService = new ChatService();
