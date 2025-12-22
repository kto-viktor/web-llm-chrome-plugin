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
    await historyManager.load();
  }

  /**
   * Loads current page content.
   * @returns {Promise<void>}
   */
  async loadPageContent() {
    try {
      const content = await getCurrentPageContent();
      this.updateState({ pageContent: content, error: null });
    } catch (error) {
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

    if (this.state.isGenerating) {
      throw new Error('Already generating a response');
    }

    this.updateState({ isGenerating: true, currentResponse: '', error: null });

    try {
      await historyManager.addMessage('user', message);

      if (historyManager.needsCompaction()) {
        await this.compactHistory();
      }

      const prompt = this.buildPrompt(message, includePageContext);

      const response = await llm.generate(prompt, {
        onToken: (token) => {
          this.updateState({
            currentResponse: (this.state.currentResponse || '') + token
          });
          if (onToken) onToken(token);
        }
      });

      await historyManager.addMessage('assistant', response);

      this.updateState({ isGenerating: false, currentResponse: null });

      return response;
    } catch (error) {
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
   * @param {Function} [onToken] - Streaming token callback
   * @returns {Promise<string>} The summary
   */
  async requestPageSummary(onToken) {
    return this.sendMessage('Give a summary of this page.', {
      includePageContext: true,
      onToken
    });
  }

  /**
   * Compacts conversation history.
   * @returns {Promise<void>}
   */
  async compactHistory() {
    await historyManager.compact(async (prompt) => {
      return llm.generate(prompt);
    });
  }

  /**
   * Clears conversation history.
   * @returns {Promise<void>}
   */
  async clearHistory() {
    await historyManager.clear();
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
