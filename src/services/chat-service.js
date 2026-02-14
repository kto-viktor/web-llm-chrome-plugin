/**
 * Chat service that orchestrates AI conversations with page context.
 * @module services/chat-service
 */

import { llm } from '../core/llm-interface.js';
import { historyManager } from './history-manager.js';
import { buildSystemMessage } from './prompt-builder.js';

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

    /** @type {AbortController|null} */
    this.abortController = null;
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
   * Builds an OpenAI-style messages array with system prompt, history, and user message.
   * Uses contiguous tail filtering for relevant history.
   * @param {string} userMessage - The user's message
   * @param {Object|null} pageContent - The page content (attachment)
   * @param {boolean} isAttached - Whether page is attached
   * @returns {Array<{role: string, content: string}>} Messages array
   */
  buildMessages(userMessage, pageContent, isAttached) {
    const pageUrl = isAttached && pageContent ? pageContent.url : null;

    // Build system message with page context and guidelines
    const systemContent = isAttached
      ? buildSystemMessage(pageContent)
      : buildSystemMessage(null);

    // Get contiguous tail of messages matching current context
    const historyMessages = historyManager.getRecentContextMessages(pageUrl);

    const messages = [
      { role: 'system', content: systemContent },
      ...historyMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];

    console.log(`[Chat Service] Built messages array: ${messages.length} messages (1 system + ${historyMessages.length} history + 1 user)`);
    return messages;
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

    // Create abort controller for this generation
    this.abortController = new AbortController();

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

      const messages = this.buildMessages(message, attachment, isAttached);

      console.log('[Chat Service] Generating response...');
      const response = await llm.generate(messages, {
        onToken: (token) => {
          this.updateState({
            currentResponse: (this.state.currentResponse || '') + token
          });
          if (onToken) onToken(token);
        },
        signal: this.abortController.signal
      });

      console.log(`[Chat Service] Response received (${response.length} chars)`);
      console.log('[Chat Service] Adding assistant message to history...');
      await historyManager.addMessage('assistant', response, null, pageUrl);

      this.updateState({ isGenerating: false, currentResponse: null });
      this.abortController = null;
      console.log('[Chat Service] Message exchange complete');

      return response;
    } catch (error) {
      // If abort controller is null, user already cancelled - exit immediately
      if (!this.abortController) {
        console.log('[Chat Service] Already cancelled, ignoring error');
        return '';
      }

      console.error('[Chat Service] Message failed:', error.message);

      // Clean up state for real errors only
      this.updateState({
        isGenerating: false,
        currentResponse: null,
        error: error.message === 'Generation cancelled' ? null : error.message
      });
      this.abortController = null;

      // Don't throw error for cancellation (it's expected behavior)
      if (error.message === 'Generation cancelled') {
        console.log('[Chat Service] Generation cancelled by user');
        return '';
      }

      throw error;
    }
  }


  /**
   * Cancels the current generation if one is in progress.
   * Immediately stops the UI state and discards partial response.
   */
  async cancelGeneration() {
    if (!this.state.isGenerating) {
      console.log('[Chat Service] Not generating, ignoring cancel');
      return;
    }

    console.log('[Chat Service] Cancelling generation immediately...');

    // Store reference before it might be cleared
    const controller = this.abortController;

    // DON'T save partial response - user cancelled, so they don't want it
    // Keeping partial responses creates noise in history and confuses the model

    // Immediately update UI state - clear everything (do this FIRST for instant feedback)
    this.updateState({
      isGenerating: false,
      currentResponse: null,
      error: null
    });

    // Clear abort controller reference so sendMessage knows we cancelled
    this.abortController = null;

    // Send abort signal for streaming loop (Gemini Nano compatibility)
    if (controller) {
      controller.abort();
    }

    // Interrupt the engine directly (WebLLM way) - don't await, let it run async
    llm.interrupt().catch(err => {
      console.error('[Chat Service] Interrupt error:', err.message);
    });

    console.log('[Chat Service] Generation cancelled (UI reset immediately)');
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
