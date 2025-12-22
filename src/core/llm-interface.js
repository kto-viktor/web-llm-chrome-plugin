/**
 * Unified LLM interface that abstracts model differences.
 * Automatically detects and uses the best available model.
 * @module core/llm-interface
 */

import { detectModels } from './model-detector.js';
import { GeminiNanoAdapter } from './gemini-nano.js';
import { WebLLMAdapter } from './webllm-adapter.js';

/**
 * LLM state.
 * @typedef {Object} LLMState
 * @property {'idle'|'detecting'|'downloading'|'ready'|'error'} status
 * @property {string|null} modelName
 * @property {string|null} displayName
 * @property {string|null} error
 * @property {number} downloadProgress - 0 to 1
 * @property {string} downloadText
 */

/**
 * Unified LLM interface that manages model selection and initialization.
 */
export class LLMInterface {
  constructor() {
    /** @type {GeminiNanoAdapter|WebLLMAdapter|null} */
    this.adapter = null;

    /** @type {LLMState} */
    this.state = {
      status: 'idle',
      modelName: null,
      displayName: null,
      error: null,
      downloadProgress: 0,
      downloadText: ''
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
   * @param {Partial<LLMState>} updates - State updates
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Initializes the LLM by detecting and loading the best available model.
   * @returns {Promise<void>}
   */
  async initialize() {
    this.updateState({ status: 'detecting' });

    try {
      const detection = await detectModels();

      if (detection.recommendedModel === 'none') {
        throw new Error('No AI model available. WebGPU required for WebLLM.');
      }

      if (detection.recommendedModel === 'gemini-nano') {
        this.adapter = new GeminiNanoAdapter();
        this.updateState({
          modelName: this.adapter.getName(),
          displayName: this.adapter.getDisplayName()
        });

        await this.adapter.initialize();
        this.updateState({ status: 'ready' });
      } else if (detection.recommendedModel === 'webllm') {
        this.adapter = new WebLLMAdapter();
        this.updateState({
          status: 'downloading',
          modelName: this.adapter.getName(),
          displayName: this.adapter.getDisplayName(),
          downloadText: 'Starting model download (one-time)...'
        });

        await this.adapter.initialize((progress) => {
          this.updateState({
            downloadProgress: progress.progress,
            downloadText: progress.text
          });
        });

        this.updateState({ status: 'ready', downloadProgress: 1 });
      }
    } catch (error) {
      this.updateState({
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generates a response for the given prompt.
   * @param {string} prompt - The user prompt
   * @param {Object} [options] - Generation options
   * @param {Function} [options.onToken] - Callback for streaming tokens
   * @returns {Promise<string>} The generated response
   */
  async generate(prompt, options = {}) {
    if (!this.adapter || this.state.status !== 'ready') {
      throw new Error('LLM not ready. Call initialize() first.');
    }

    return this.adapter.generate(prompt, options);
  }

  /**
   * Checks if the LLM is ready to use.
   * @returns {boolean} Whether the LLM is ready
   */
  isReady() {
    return this.state.status === 'ready' && this.adapter?.isReady();
  }

  /**
   * Gets the current state.
   * @returns {LLMState} The current state
   */
  getState() {
    return this.state;
  }

  /**
   * Destroys the adapter and cleans up resources.
   */
  async destroy() {
    if (this.adapter) {
      await this.adapter.destroy();
      this.adapter = null;
    }
    this.updateState({
      status: 'idle',
      modelName: null,
      displayName: null,
      error: null,
      downloadProgress: 0,
      downloadText: ''
    });
  }
}

/**
 * Singleton instance of the LLM interface.
 */
export const llm = new LLMInterface();
