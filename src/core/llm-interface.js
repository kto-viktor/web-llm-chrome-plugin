/**
 * Unified LLM interface that abstracts model differences.
 * Automatically detects and uses the best available model.
 * @module core/llm-interface
 */

import { detectModels } from './model-detector.js';
import { GeminiNanoAdapter } from './gemini-nano.js';
import { WebLLMAdapter } from './webllm-adapter.js';
import { SummarizerAdapter } from './summarizer.js';

/**
 * LLM state.
 * @typedef {Object} LLMState
 * @property {'idle'|'detecting'|'downloading'|'ready'|'error'|'gemini-unavailable'} status
 * @property {string|null} modelName
 * @property {string|null} displayName
 * @property {string|null} error
 * @property {number} downloadProgress - 0 to 1
 * @property {string} downloadText
 * @property {boolean} summarizerAvailable - Whether native Summarizer is available
 * @property {boolean} geminiNanoAvailable - Whether Gemini Nano is available
 */

/**
 * Unified LLM interface that manages model selection and initialization.
 */
export class LLMInterface {
  constructor() {
    /** @type {GeminiNanoAdapter|WebLLMAdapter|null} */
    this.adapter = null;

    /** @type {SummarizerAdapter|null} */
    this.summarizer = null;

    /** @type {LLMState} */
    this.state = {
      status: 'idle',
      modelName: null,
      displayName: null,
      error: null,
      downloadProgress: 0,
      downloadText: '',
      summarizerAvailable: false,
      geminiNanoAvailable: false
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
    console.log('[LLM Interface] Starting model detection...');
    this.updateState({ status: 'detecting' });

    try {
      const detection = await detectModels();

      console.log('[LLM Interface] Detection result:', detection);
      console.log(`[LLM Interface] Gemini Nano available: ${detection.geminiNanoAvailable}`);
      console.log(`[LLM Interface] Summarizer available: ${detection.summarizerAvailable}`);
      console.log(`[LLM Interface] WebLLM supported: ${detection.webLLMSupported}`);
      console.log(`[LLM Interface] Recommended model: ${detection.recommendedModel}`);

      // Store Gemini Nano availability for UI
      this.updateState({ geminiNanoAvailable: detection.geminiNanoAvailable });

      if (detection.geminiNanoReason) {
        console.log(`[LLM Interface] Gemini Nano reason: ${detection.geminiNanoReason}`);
      }

      if (detection.recommendedModel === 'none') {
        throw new Error('No AI model available. WebGPU required for WebLLM.');
      }

      // Gemini Nano is preferred when available
      if (detection.recommendedModel === 'gemini-nano') {
        console.log('[LLM Interface] Using Gemini Nano (Chrome built-in)');
        this.adapter = new GeminiNanoAdapter();
        this.updateState({
          modelName: this.adapter.getName(),
          displayName: this.adapter.getDisplayName()
        });

        // Initialize Gemini Nano with download progress callback
        await this.adapter.initialize((progress) => {
          this.updateState({
            status: 'downloading',
            downloadProgress: progress.progress,
            downloadText: progress.text
          });
        });

        // Initialize Summarizer if available
        if (detection.summarizerAvailable) {
          console.log('[LLM Interface] Initializing Summarizer...');
          try {
            this.summarizer = new SummarizerAdapter();
            await this.summarizer.initialize();
            this.updateState({ summarizerAvailable: true });
            console.log('[LLM Interface] Summarizer ready');
          } catch (error) {
            console.warn('[LLM Interface] Summarizer init failed, will use fallback:', error.message);
            this.summarizer = null;
          }
        }

        this.updateState({ status: 'ready' });
        console.log('[LLM Interface] Gemini Nano ready');
      } else if (detection.recommendedModel === 'webllm') {
        // Default to TinyLlama when Gemini Nano is not available
        console.log('[LLM Interface] Using WebLLM (TinyLlama 1.1B)');
        this.adapter = new WebLLMAdapter('tinyllama');
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
        console.log('[LLM Interface] WebLLM ready');
      }
    } catch (error) {
      console.error('[LLM Interface] Initialization failed:', error);
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
   * Summarizes text using the best available method.
   * Uses native Summarizer API if available, falls back to prompt-based.
   * @param {string} text - The text to summarize
   * @param {Object} [options] - Summarization options
   * @param {Function} [options.onToken] - Callback for streaming tokens
   * @returns {Promise<string>} The summary
   */
  async summarize(text, options = {}) {
    if (!this.adapter || this.state.status !== 'ready') {
      throw new Error('LLM not ready. Call initialize() first.');
    }

    // Use native Summarizer if available (Gemini only)
    if (this.summarizer && this.summarizer.isReady()) {
      console.log('[LLM Interface] Using native Summarizer API');
      if (options.onToken) {
        return this.summarizer.summarizeStreaming(text, options.onToken, options);
      }
      return this.summarizer.summarize(text, options);
    }

    // Fallback to adapter's summarize method (prompt-based)
    console.log('[LLM Interface] Using prompt-based summarization');
    return this.adapter.summarize(text, options);
  }

  /**
   * Checks if native Summarizer API is available.
   * @returns {boolean} Whether native Summarizer is ready
   */
  isSummarizerAvailable() {
    return this.state.summarizerAvailable && this.summarizer?.isReady();
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
   * Switches to a different model.
   * @param {'gemini-nano'|'webllm-qwen'|'webllm-deepseek'} modelName - The model to switch to
   * @returns {Promise<void>}
   */
  async switchModel(modelName) {
    console.log(`[LLM Interface] Switching to model: ${modelName}`);

    // Check Gemini Nano availability before attempting to switch
    if (modelName === 'gemini-nano') {
      const detection = await detectModels();
      if (!detection.geminiNanoAvailable) {
        console.log('[LLM Interface] Gemini Nano not available');
        this.updateState({
          status: 'gemini-unavailable',
          geminiNanoAvailable: false,
          error: 'Gemini Nano requires setup in Chrome flags'
        });
        return; // Don't throw - let UI handle this state
      }
    }

    // Clean up current adapter
    await this.destroy();

    this.updateState({ status: 'detecting' });

    try {
      if (modelName === 'gemini-nano') {
        console.log('[LLM Interface] Loading Gemini Nano...');
        this.adapter = new GeminiNanoAdapter();
        this.updateState({
          modelName: this.adapter.getName(),
          displayName: this.adapter.getDisplayName(),
          geminiNanoAvailable: true
        });

        await this.adapter.initialize((progress) => {
          this.updateState({
            status: 'downloading',
            downloadProgress: progress.progress,
            downloadText: progress.text
          });
        });

        // Try to initialize Summarizer
        try {
          this.summarizer = new SummarizerAdapter();
          await this.summarizer.initialize();
          this.updateState({ summarizerAvailable: true });
        } catch {
          this.summarizer = null;
        }

        this.updateState({ status: 'ready' });
        console.log('[LLM Interface] Gemini Nano ready');

      } else if (modelName === 'webllm-tinyllama') {
        console.log('[LLM Interface] Loading WebLLM TinyLlama...');
        this.adapter = new WebLLMAdapter('tinyllama');
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
        console.log('[LLM Interface] WebLLM TinyLlama ready');

      } else if (modelName === 'webllm-qwen') {
        console.log('[LLM Interface] Loading WebLLM Qwen...');
        this.adapter = new WebLLMAdapter('qwen');
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
        console.log('[LLM Interface] WebLLM Qwen ready');

      } else if (modelName === 'webllm-deepseek') {
        console.log('[LLM Interface] Loading WebLLM DeepSeek...');
        this.adapter = new WebLLMAdapter('deepseek');
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
        console.log('[LLM Interface] WebLLM DeepSeek ready');

      } else {
        throw new Error(`Unknown model: ${modelName}`);
      }
    } catch (error) {
      console.error('[LLM Interface] Switch failed:', error);
      this.updateState({
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Destroys the adapter and cleans up resources.
   */
  async destroy() {
    if (this.summarizer) {
      await this.summarizer.destroy();
      this.summarizer = null;
    }
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
      downloadText: '',
      summarizerAvailable: false,
      geminiNanoAvailable: this.state.geminiNanoAvailable // Preserve detection result
    });
  }
}

/**
 * Singleton instance of the LLM interface.
 */
export const llm = new LLMInterface();
