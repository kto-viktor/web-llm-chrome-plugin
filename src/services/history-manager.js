/**
 * Manages conversation history with persistence and smart compaction.
 * @module services/history-manager
 */

import { countWords } from '../utils/text-utils.js';

/**
 * Maximum words before triggering compaction.
 */
const COMPACTION_THRESHOLD = 800;

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
          console.log(`[History] Loaded ${this.messages.length} messages (${this.getTotalWordCount()} words)`);
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
   * Adds a message to the history.
   * @param {'user'|'assistant'} role - The message role
   * @param {string} content - The message content
   * @param {PageAttachment} [attachment] - Optional page attachment
   * @returns {Promise<void>}
   */
  async addMessage(role, content, attachment = null) {
    const wordCount = countWords(content);
    console.log(`[History] Adding ${role} message (${wordCount} words)${attachment ? ' with attachment' : ''}`);

    const message = {
      role,
      content,
      timestamp: Date.now()
    };

    if (attachment) {
      message.attachment = {
        title: attachment.title,
        url: attachment.url,
        content: attachment.content
      };
    }

    this.messages.push(message);

    console.log(`[History] Total: ${this.messages.length} messages, ${this.getTotalWordCount()} words`);
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
   * Counts total words in history.
   * @returns {number} Total word count
   */
  getTotalWordCount() {
    return this.messages.reduce((total, msg) => total + countWords(msg.content), 0);
  }

  /**
   * Checks if history needs compaction.
   * @returns {boolean} Whether compaction is needed
   */
  needsCompaction() {
    const totalWords = this.getTotalWordCount();
    const needsIt = totalWords > COMPACTION_THRESHOLD;
    console.log(`[History] Compaction check: ${totalWords} words (threshold: ${COMPACTION_THRESHOLD}) → ${needsIt ? 'NEEDS COMPACTION' : 'OK'}`);
    return needsIt;
  }

  /**
   * Compacts history using the provided summarization function.
   * @param {Function} summarize - Function that takes history text and returns summary
   * @returns {Promise<void>}
   */
  async compact(summarize) {
    console.log(`[History] Starting compaction (${this.messages.length} messages, ${this.getTotalWordCount()} words)`);

    if (this.messages.length <= 2) {
      console.log('[History] Too few messages to compact, skipping');
      return;
    }

    const historyText = this.formatForPrompt();

    const prompt = `Summarize this conversation history concisely, preserving key facts, context, and any important details the user mentioned. Keep it under 200 words:

${historyText}`;

    console.log('[History] Summarizing history...');
    const summary = await summarize(prompt);
    console.log(`[History] Summary generated (${countWords(summary)} words)`);

    this.messages = [{
      role: 'assistant',
      content: `[Previous conversation summary: ${summary}]`,
      timestamp: Date.now()
    }];

    await this.save();
    this.notifyListeners();
    console.log('[History] Compaction complete');
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
