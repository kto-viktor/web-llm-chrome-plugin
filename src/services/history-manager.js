/**
 * Manages conversation history with persistence and smart compaction.
 * @module services/history-manager
 */

import { countTokens } from '../utils/token-utils.js';
import { normalizePageUrl } from '../utils/url-utils.js';

/**
 * Maximum tokens allowed in history before trimming oldest messages.
 */
const MAX_HISTORY_TOKENS = 800;

/**
 * Maximum tokens allowed for a single user message.
 */
const MAX_USER_MESSAGE_TOKENS = 400;

/**
 * Storage key for persisted history.
 */
const STORAGE_KEY = 'chat_history';

/**
 * Page attachment for a message.
 * @typedef {Object} PageAttachment
 * @property {string} title - The page title
 * @property {string} url - The page URL
 * @property {string} content - The page content
 */

/**
 * Chat message.
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {number} timestamp
 * @property {PageAttachment} [attachment] - Optional page attachment
 * @property {string} [pageUrl] - Normalized URL of the page this message was sent on
 */

/**
 * Manages conversation history.
 */
export class HistoryManager {
  constructor() {
    /** @type {ChatMessage[]} */
    this.messages = [];

    /** @type {Set<Function>} */
    this.listeners = new Set();

    /** @type {boolean} */
    this.loaded = false;
  }

  /**
   * Subscribes to history changes.
   * @param {Function} listener - Callback receiving the messages array
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.messages);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notifies all listeners of changes.
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.messages));
  }

  /**
   * Loads history from chrome.storage.local.
   * @returns {Promise<void>}
   */
  async load() {
    console.log('[History] Loading from storage...');
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result[STORAGE_KEY]) {
          this.messages = result[STORAGE_KEY];
          console.log(`[History] Loaded ${this.messages.length} messages (${this.getTotalTokenCount()} tokens)`);
        } else {
          console.log('[History] No saved history found');
        }
        this.loaded = true;
        this.notifyListeners();
        resolve();
      });
    });
  }

  /**
   * Saves history to chrome.storage.local.
   * @returns {Promise<void>}
   */
  async save() {
    console.log(`[History] Saving ${this.messages.length} messages to storage...`);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: this.messages }, () => {
        console.log('[History] Saved to storage');
        resolve();
      });
    });
  }

  /**
   * Validates user message length.
   * @param {string} content - The message content
   * @returns {{valid: boolean, tokenCount: number, maxTokens: number}}
   */
  validateMessageLength(content) {
    const tokenCount = countTokens(content);
    return {
      valid: tokenCount <= MAX_USER_MESSAGE_TOKENS,
      tokenCount,
      maxTokens: MAX_USER_MESSAGE_TOKENS
    };
  }

  /**
   * Adds a message to the history.
   * @param {'user'|'assistant'} role - The message role
   * @param {string} content - The message content
   * @param {PageAttachment} [attachment] - Optional page attachment
   * @param {string} [pageUrl] - URL of the page this message was sent on
   * @returns {Promise<void>}
   */
  async addMessage(role, content, attachment = null, pageUrl = null) {
    const tokenCount = countTokens(content);
    const normalizedPageUrl = normalizePageUrl(pageUrl);
    console.log(`[History] Adding ${role} message (${tokenCount} tokens)${attachment ? ' with attachment' : ''}${normalizedPageUrl ? ` for page: ${normalizedPageUrl}` : ''}`);

    const message = {
      role,
      content,
      timestamp: Date.now()
    };

    if (attachment) {
      // Only store title and url, not content (to avoid bloating history)
      message.attachment = {
        title: attachment.title,
        url: attachment.url
      };
    }

    if (normalizedPageUrl) {
      message.pageUrl = normalizedPageUrl;
    }

    this.messages.push(message);

    console.log(`[History] Total: ${this.messages.length} messages, ${this.getTotalTokenCount()} tokens`);
    await this.save();
    this.notifyListeners();
  }

  /**
   * Gets all messages.
   * @returns {ChatMessage[]} The messages array
   */
  getMessages() {
    return [...this.messages];
  }

  /**
   * Gets the contiguous tail of messages matching the current context.
   * Walks from the end and stops at the first message that doesn't match.
   * @param {string|null} pageUrl - The page URL (null for no-page mode)
   * @returns {ChatMessage[]} Contiguous tail of matching messages
   */
  getRecentContextMessages(pageUrl = null) {
    const normalizedTarget = pageUrl ? normalizePageUrl(pageUrl) : null;
    const result = [];

    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      const msgPageUrl = msg.pageUrl || null;

      if (normalizedTarget) {
        // Attached mode: message must match this page
        if (msgPageUrl !== normalizedTarget) break;
      } else {
        // No-page mode: message must have no pageUrl
        if (msgPageUrl !== null) break;
      }

      result.unshift(msg);
    }

    return result;
  }

  /**
   * Gets messages filtered by page URL.
   * Includes orphan messages (no pageUrl) for backward compatibility.
   * @param {string} pageUrl - The page URL to filter by
   * @returns {ChatMessage[]} Filtered messages array
   */
  getMessagesByPage(pageUrl) {
    const normalizedTarget = normalizePageUrl(pageUrl);
    const filtered = this.messages.filter(msg => {
      // Include orphans (no pageUrl) everywhere for backward compat
      if (!msg.pageUrl) return true;
      // Match normalized URLs
      return msg.pageUrl === normalizedTarget;
    });
    console.log(`[History] Filtering ${this.messages.length} messages for page: ${normalizedTarget} → ${filtered.length} matches`);
    return filtered;
  }

  /**
   * Formats history for inclusion in a prompt.
   * @returns {string} Formatted conversation history
   */
  formatForPrompt() {
    if (this.messages.length === 0) {
      return '';
    }

    return this.messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * Counts total tokens in history.
   * @returns {number} Total token count
   */
  getTotalTokenCount() {
    return this.messages.reduce((total, msg) => total + countTokens(msg.content), 0);
  }

  /**
   * Checks if history needs trimming.
   * @returns {boolean} Whether trimming is needed
   */
  needsTrimming() {
    const totalTokens = this.getTotalTokenCount();
    const needsIt = totalTokens > MAX_HISTORY_TOKENS;
    console.log(`[History] Trim check: ${totalTokens} tokens (max: ${MAX_HISTORY_TOKENS}) → ${needsIt ? 'NEEDS TRIM' : 'OK'}`);
    return needsIt;
  }

  /**
   * Trims history by removing oldest messages until under token limit.
   * Uses sliding window approach - no LLM summarization needed.
   * @returns {Promise<void>}
   */
  async trimToLimit() {
    console.log(`[History] Trimming (${this.messages.length} messages, ${this.getTotalTokenCount()} tokens)`);

    if (this.messages.length <= 2) {
      console.log('[History] Too few messages to trim, skipping');
      return;
    }

    // Remove oldest messages until under limit
    while (this.messages.length > 2 && this.getTotalTokenCount() > MAX_HISTORY_TOKENS) {
      const removed = this.messages.shift();
      console.log(`[History] Removed oldest message (${countTokens(removed.content)} tokens)`);
    }

    console.log(`[History] After trim: ${this.messages.length} messages, ${this.getTotalTokenCount()} tokens`);
    await this.save();
    this.notifyListeners();
  }

  /**
   * Clears all history.
   * @returns {Promise<void>}
   */
  async clear() {
    console.log(`[History] Clearing ${this.messages.length} messages...`);
    this.messages = [];
    await this.save();
    this.notifyListeners();
    console.log('[History] Cleared');
  }

  /**
   * Gets the last N messages.
   * @param {number} n - Number of messages to get
   * @returns {ChatMessage[]} The last N messages
   */
  getLastMessages(n) {
    return this.messages.slice(-n);
  }
}

/**
 * Singleton instance of the history manager.
 */
export const historyManager = new HistoryManager();
