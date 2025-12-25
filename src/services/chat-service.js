/**
 * Chat service that orchestrates AI conversations with page context.
 * @module services/chat-service
 */

import { llm } from '../core/llm-interface.js';
import { historyManager } from './history-manager.js';
import { buildChatPrompt } from './prompt-builder.js';

/**
 * Chat state.
 * @typedef {Object} ChatState
 * @property {boolean} isGenerating
 * @property {string|null} currentResponse
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
   * Builds the full prompt with context using the template.
   * @param {string} userMessage - The user's message
   * @param {Object|null} pageContent - The page content
   * @returns {string} The complete prompt
   */
  buildPrompt(userMessage, pageContent) {
    const messages = historyManager.getMessages();
    return buildChatPrompt(userMessage, pageContent, messages);
  }

  /**
   * Sends a message and gets a response.
   * @param {string} message - The user's message
   * @param {Object} [options] - Options
   * @param {Object} [options.attachment] - Page attachment
   * @param {Function} [options.onToken] - Streaming token callback
   * @returns {Promise<string>} The assistant's response
   */
  async sendMessage(message, options = {}) {
    const { attachment, onToken } = options;

    console.log(`[Chat Service] Sending message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    if (attachment) {
      console.log(`[Chat Service] With attachment: "${attachment.title}"`);
    }

    if (this.state.isGenerating) {
      console.warn('[Chat Service] Already generating, rejecting new message');
      throw new Error('Already generating a response');
    }

    this.updateState({ isGenerating: true, currentResponse: '', error: null });

    try {
      console.log('[Chat Service] Adding user message to history...');
      await historyManager.addMessage('user', message, attachment);

      if (historyManager.needsCompaction()) {
        console.log('[Chat Service] History needs compaction, compacting...');
        await this.compactHistory();
      }

      const prompt = this.buildPrompt(message, attachment);
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
   * @param {Object} [attachment] - Page attachment
   * @param {Function} [onToken] - Streaming token callback
   * @returns {Promise<string>} The summary
   */
  async requestPageSummary(attachment, onToken) {
    // If we have attachment content and Summarizer is available, use it directly
    if (attachment?.content && llm.isSummarizerAvailable()) {
      console.log('[Chat Service] Using Summarizer API for page summary');

      this.updateState({ isGenerating: true, currentResponse: '', error: null });

      try {
        // Add user message to history with attachment
        await historyManager.addMessage('user', 'Give a summary of this page.', attachment);

        // Use Summarizer API
        const summary = await llm.summarize(attachment.content, {
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
    return this.sendMessage('Give a summary of this page.', { attachment, onToken });
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
