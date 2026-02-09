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
   * Filters history based on attachment mode:
   * - When attached: only messages from current page
   * - When not attached: all messages (general conversation)
   * @param {string} userMessage - The user's message
   * @param {Object|null} pageContent - The page content
   * @param {boolean} isAttached - Whether page is attached
   * @returns {string} The complete prompt
   */
  buildPrompt(userMessage, pageContent, isAttached) {
    let messages;
    if (isAttached && pageContent) {
      // When attached, filter to current page only
      const pageUrl = pageContent.url;
      messages = historyManager.getMessagesByPage(pageUrl);
    } else {
      // When not attached, use all messages
      messages = historyManager.getMessages();
    }
    return buildChatPrompt(userMessage, pageContent, messages, isAttached);
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

    // If attachment is null, treat as not attached
    const isAttached = attachment !== null;

    console.log(`[Chat Service] Sending message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    if (attachment) {
      console.log(`[Chat Service] With attachment: "${attachment.title}"`);
    } else {
      console.log('[Chat Service] No attachment (general assistant mode)');
    }

    if (this.state.isGenerating) {
      console.warn('[Chat Service] Already generating, rejecting new message');
      throw new Error('Already generating a response');
    }

    // Validate user message length
    const validation = historyManager.validateMessageLength(message);
    if (!validation.valid) {
      console.warn(`[Chat Service] Message too long: ${validation.tokenCount} tokens (max: ${validation.maxTokens})`);
      throw new Error(`Message too long (${validation.tokenCount} tokens). Please keep it under ${validation.maxTokens} tokens.`);
    }

    this.updateState({ isGenerating: true, currentResponse: '', error: null });

    // Determine page URL for history filtering
    const pageUrl = attachment?.url || null;

    try {
      console.log('[Chat Service] Adding user message to history...');
      await historyManager.addMessage('user', message, attachment, pageUrl);

      // Trim history if needed (sliding window)
      if (historyManager.needsTrimming()) {
        console.log('[Chat Service] History needs trimming...');
        await historyManager.trimToLimit();
      }

      const prompt = this.buildPrompt(message, attachment, isAttached);
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
      await historyManager.addMessage('assistant', response, null, pageUrl);

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
