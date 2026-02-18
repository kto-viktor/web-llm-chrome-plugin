/**
 * Unified LLM interface that abstracts model differences.
 * Automatically detects and uses the best available model.
 * @module core/llm-interface
 */

import { detectModels } from './model-detector.js';
import { GeminiNanoAdapter } from './gemini-nano.js';
import { WebLLMAdapter, WEBLLM_MODELS } from './webllm-adapter.js';
import { SummarizerAdapter } from './summarizer.js';
import { hasModelInCache, prebuiltAppConfig } from '@mlc-ai/web-llm';

/**
 * Background download info.
 * @typedef {Object} BackgroundDownload
 * @property {string} modelName - Model identifier
 * @property {string} displayName - Display name
 * @property {number} progress - Download progress 0 to 1
 * @property {string} text - Progress text
 * @property {Object} adapter - The adapter handling this download
 */

/**
 * LLM state.
 * @typedef {Object} LLMState
 * @property {'idle'|'detecting'|'downloading'|'ready'|'error'|'gemini-unavailable'|'awaiting-selection'} status
 * @property {string|null} modelName
 * @property {string|null} displayName
 * @property {string|null} error
 * @property {number} downloadProgress - 0 to 1
 * @property {string} downloadText
 * @property {boolean} summarizerAvailable - Whether native Summarizer is available
 * @property {boolean} geminiNanoAvailable - Whether Gemini Nano is available
 * @property {Array<BackgroundDownload>} backgroundDownloads - Active background downloads
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
      geminiNanoAvailable: false,
      backgroundDownloads: [],
      completedBackgroundModels: []
    };

    /** @type {Set<Function>} */
    this.listeners = new Set();

    /** @type {Set<string>} */
    this.cancelledModels = new Set();

    /** @type {Map<string, BackgroundDownload>} */
    this.backgroundDownloadsMap = new Map();
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

      // Always show model selection screen - no auto-loading
      this.updateState({
        status: 'awaiting-selection',
        geminiNanoAvailable: detection.geminiNanoAvailable
      });
      console.log('[LLM Interface] Awaiting user model selection');
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
   * Generates a response for the given messages array.
   * @param {Array<{role: string, content: string}>} messages - OpenAI-style messages array
   * @param {Object} [options] - Generation options
   * @param {Function} [options.onToken] - Callback for streaming tokens
   * @param {AbortSignal} [options.signal] - Optional abort signal
   * @returns {Promise<string>} The generated response
   */
  async generate(messages, options = {}) {
    if (!this.adapter || this.state.status !== 'ready') {
      throw new Error('LLM not ready. Call initialize() first.');
    }

    return this.adapter.generate(messages, options);
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
   * Interrupts the current generation.
   * Uses the adapter's interrupt method if available.
   * @returns {Promise<void>}
   */
  async interrupt() {
    if (this.adapter && typeof this.adapter.interrupt === 'function') {
      console.log('[LLM Interface] Interrupting generation...');
      await this.adapter.interrupt();
    }
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
   * @param {'gemini-nano'|'webllm-gemma'|'webllm-hermes'|'webllm-deepseek'|'webllm-llama70b'} modelName - The model to switch to
   * @returns {Promise<void>}
   */
  async switchModel(modelName) {
    console.log(`[LLM Interface] Switching to model: ${modelName}`);

    // Remove from cancelled list if starting fresh
    this.cancelledModels.delete(modelName);

    // If currently downloading, move to background FIRST (before any checks that might return early)
    if (this.state.status === 'downloading') {
      console.log('[LLM Interface] Moving current download to background');
      this.moveToBackground();
    }

    // Check Gemini Nano availability before attempting to switch
    if (modelName === 'gemini-nano') {
      const detection = await detectModels();
      if (!detection.geminiNanoAvailable) {
        console.log('[LLM Interface] Gemini Nano not available');
        this.updateState({
          status: 'gemini-unavailable',
          modelName: 'gemini-nano',
          displayName: 'Gemini Nano',
          geminiNanoAvailable: false,
          error: 'Gemini Nano requires setup in Chrome flags'
        });
        return; // Don't throw - let UI handle this state
      }
    }

    // Clean up current adapter if we weren't downloading
    if (this.state.status !== 'downloading') {
      await this.destroy();
    }

    this.updateState({ status: 'detecting' });

    try {
      if (modelName === 'gemini-nano') {
        console.log('[LLM Interface] Loading Gemini Nano...');
        this.adapter = new GeminiNanoAdapter();
        const currentModelName = this.adapter.getName();
        this.updateState({
          modelName: currentModelName,
          displayName: this.adapter.getDisplayName(),
          geminiNanoAvailable: true
        });

        const progressCallback = this.createProgressCallback(currentModelName);
        await this.adapter.initialize((progress) => {
          // First update sets status to downloading
          if (this.state.status !== 'downloading' && !this.backgroundDownloadsMap.has(currentModelName)) {
            this.updateState({ status: 'downloading' });
          }
          progressCallback(progress);
        });

        // Check if this download was moved to background or cancelled
        const wasMovedToBackground = this.backgroundDownloadsMap.has(currentModelName);
        const wasCancelled = this.cancelledModels.has(currentModelName);

        if (wasMovedToBackground) {
          console.log('[LLM Interface] Gemini Nano completed in background');
          this.removeBackgroundDownload(currentModelName);
          this.notifyBackgroundComplete(currentModelName);
          return;
        }

        if (wasCancelled) {
          console.log('[LLM Interface] Gemini Nano was cancelled, ignoring completion');
          return;
        }

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

      } else if (modelName === 'webllm-gemma') {
        console.log('[LLM Interface] Loading WebLLM Gemma...');
        this.adapter = new WebLLMAdapter('gemma');
        const currentModelName = this.adapter.getName();
        this.updateState({
          status: 'downloading',
          modelName: currentModelName,
          displayName: this.adapter.getDisplayName(),
          downloadText: 'Getting LLM for you...'
        });

        const progressCallback = this.createProgressCallback(currentModelName);
        await this.adapter.initialize(progressCallback);

        // Check if moved to background or cancelled
        const wasMovedToBackground = this.backgroundDownloadsMap.has(currentModelName);
        const wasCancelled = this.cancelledModels.has(currentModelName);

        if (wasMovedToBackground) {
          console.log('[LLM Interface] WebLLM Gemma completed in background');
          this.removeBackgroundDownload(currentModelName);
          this.notifyBackgroundComplete(currentModelName);
          return;
        }

        if (wasCancelled) {
          console.log('[LLM Interface] WebLLM Gemma was cancelled');
          return;
        }

        this.updateState({ status: 'ready', downloadProgress: 1 });
        console.log('[LLM Interface] WebLLM Gemma ready');

      } else if (modelName === 'webllm-hermes') {
        console.log('[LLM Interface] Loading WebLLM Hermes...');
        this.adapter = new WebLLMAdapter('hermes');
        const currentModelName = this.adapter.getName();
        this.updateState({
          status: 'downloading',
          modelName: currentModelName,
          displayName: this.adapter.getDisplayName(),
          downloadText: 'Getting LLM for you...'
        });

        const progressCallback = this.createProgressCallback(currentModelName);
        await this.adapter.initialize(progressCallback);

        // Check if moved to background or cancelled
        const wasMovedToBackground = this.backgroundDownloadsMap.has(currentModelName);
        const wasCancelled = this.cancelledModels.has(currentModelName);

        if (wasMovedToBackground) {
          console.log('[LLM Interface] WebLLM Hermes completed in background');
          this.removeBackgroundDownload(currentModelName);
          this.notifyBackgroundComplete(currentModelName);
          return;
        }

        if (wasCancelled) {
          console.log('[LLM Interface] WebLLM Hermes was cancelled');
          return;
        }

        this.updateState({ status: 'ready', downloadProgress: 1 });
        console.log('[LLM Interface] WebLLM Hermes ready');

      } else if (modelName === 'webllm-deepseek') {
        console.log('[LLM Interface] Loading WebLLM DeepSeek...');
        this.adapter = new WebLLMAdapter('deepseek');
        const currentModelName = this.adapter.getName();
        this.updateState({
          status: 'downloading',
          modelName: currentModelName,
          displayName: this.adapter.getDisplayName(),
          downloadText: 'Getting LLM for you...'
        });

        const progressCallback = this.createProgressCallback(currentModelName);
        await this.adapter.initialize(progressCallback);

        // Check if moved to background or cancelled
        const wasMovedToBackground = this.backgroundDownloadsMap.has(currentModelName);
        const wasCancelled = this.cancelledModels.has(currentModelName);

        if (wasMovedToBackground) {
          console.log('[LLM Interface] WebLLM DeepSeek completed in background');
          this.removeBackgroundDownload(currentModelName);
          this.notifyBackgroundComplete(currentModelName);
          return;
        }

        if (wasCancelled) {
          console.log('[LLM Interface] WebLLM DeepSeek was cancelled');
          return;
        }

        this.updateState({ status: 'ready', downloadProgress: 1 });
        console.log('[LLM Interface] WebLLM DeepSeek ready');

      } else if (modelName === 'webllm-llama70b') {
        console.log('[LLM Interface] Loading WebLLM Llama 70B...');
        this.adapter = new WebLLMAdapter('llama70b');
        const currentModelName = this.adapter.getName();
        this.updateState({
          status: 'downloading',
          modelName: currentModelName,
          displayName: this.adapter.getDisplayName(),
          downloadText: 'Getting LLM for you...'
        });

        const progressCallback = this.createProgressCallback(currentModelName);
        await this.adapter.initialize(progressCallback);

        // Check if moved to background or cancelled
        const wasMovedToBackground = this.backgroundDownloadsMap.has(currentModelName);
        const wasCancelled = this.cancelledModels.has(currentModelName);

        if (wasMovedToBackground) {
          console.log('[LLM Interface] WebLLM Llama 70B completed in background');
          this.removeBackgroundDownload(currentModelName);
          this.notifyBackgroundComplete(currentModelName);
          return;
        }

        if (wasCancelled) {
          console.log('[LLM Interface] WebLLM Llama 70B was cancelled');
          return;
        }

        this.updateState({ status: 'ready', downloadProgress: 1 });
        console.log('[LLM Interface] WebLLM Llama 70B ready');

      } else {
        throw new Error(`Unknown model: ${modelName}`);
      }
    } catch (error) {
      console.error('[LLM Interface] Switch failed:', error);

      // Don't set error state if this model was cancelled
      const wasCancelled = this.cancelledModels.has(modelName);
      if (!wasCancelled) {
        this.updateState({
          status: 'error',
          error: error.message
        });
      } else {
        console.log('[LLM Interface] Error ignored - model was cancelled:', modelName);
        this.cancelledModels.delete(modelName); // Clean up
      }

      throw error;
    }
  }

  /**
   * Creates a progress callback that updates foreground or background state.
   * @param {string} modelName - The model being downloaded
   * @returns {Function} Progress callback function
   * @private
   */
  createProgressCallback(modelName) {
    return (progress) => {
      // Check if this download is in background
      const bgDownload = this.backgroundDownloadsMap.get(modelName);

      if (bgDownload) {
        // Update background download
        bgDownload.progress = progress.progress;
        bgDownload.text = progress.text;
        this.updateBackgroundDownloadsState();
      } else if (this.state.modelName === modelName) {
        // Update foreground download
        this.updateState({
          downloadProgress: progress.progress,
          downloadText: progress.text
        });
      }
    };
  }

  /**
   * Moves current download to background and starts tracking it.
   * @private
   */
  moveToBackground() {
    if (!this.adapter || this.state.status !== 'downloading') {
      return;
    }

    const modelName = this.state.modelName;
    if (!modelName) return;

    console.log('[LLM Interface] Moving download to background:', modelName);

    // Create background download entry
    const bgDownload = {
      modelName,
      displayName: this.state.displayName,
      progress: this.state.downloadProgress,
      text: this.state.downloadText,
      adapter: this.adapter
    };

    this.backgroundDownloadsMap.set(modelName, bgDownload);
    this.updateBackgroundDownloadsState();

    // Clear current adapter reference (it's now in background)
    this.adapter = null;

    // Clear foreground download state
    this.updateState({
      status: 'idle',
      modelName: null,
      displayName: null,
      downloadProgress: 0,
      downloadText: ''
    });
  }

  /**
   * Updates the state with current background downloads.
   * @private
   */
  updateBackgroundDownloadsState() {
    const backgroundDownloads = Array.from(this.backgroundDownloadsMap.values()).map(bg => ({
      modelName: bg.modelName,
      displayName: bg.displayName,
      progress: bg.progress,
      text: bg.text
    }));

    this.updateState({ backgroundDownloads });
  }

  /**
   * Cancels a background download.
   * @param {string} modelName - The model to cancel
   */
  cancelBackgroundDownload(modelName) {
    console.log('[LLM Interface] Cancelling background download:', modelName);

    const bgDownload = this.backgroundDownloadsMap.get(modelName);
    if (!bgDownload) return;

    // Mark as cancelled
    this.cancelledModels.add(modelName);

    // Cancel the adapter
    if (bgDownload.adapter && typeof bgDownload.adapter.cancel === 'function') {
      bgDownload.adapter.cancel();
    }

    // Clean up the adapter
    if (bgDownload.adapter && typeof bgDownload.adapter.destroy === 'function') {
      bgDownload.adapter.destroy().catch(err =>
        console.error('[LLM Interface] Error destroying background adapter:', err)
      );
    }

    // Remove from map
    this.backgroundDownloadsMap.delete(modelName);
    this.updateBackgroundDownloadsState();
  }

  /**
   * Notifies that a background download has completed by adding it to completedBackgroundModels.
   * @param {string} modelName - The model that completed in background
   * @private
   */
  notifyBackgroundComplete(modelName) {
    const completed = [...(this.state.completedBackgroundModels || []), modelName];
    this.updateState({ completedBackgroundModels: completed });
  }

  /**
   * Removes a completed background download from tracking.
   * @param {string} modelName - The model that completed
   * @private
   */
  removeBackgroundDownload(modelName) {
    console.log('[LLM Interface] Removing completed background download:', modelName);
    this.backgroundDownloadsMap.delete(modelName);
    this.updateBackgroundDownloadsState();
  }

  /**
   * Cancels the current download and returns to model selection screen.
   * @returns {Promise<void>}
   */
  async cancelDownload() {
    console.log('[LLM Interface] Cancelling download...');

    // Track the cancelled model to prevent error state later
    if (this.state.modelName) {
      this.cancelledModels.add(this.state.modelName);
      console.log('[LLM Interface] Marked as cancelled:', this.state.modelName);
    }

    // Signal adapter to cancel (stops progress callbacks from continuing)
    if (this.adapter && typeof this.adapter.cancel === 'function') {
      this.adapter.cancel();
    }

    await this.destroy();
    this.updateState({
      status: 'awaiting-selection',
      downloadProgress: 0,
      downloadText: '',
      error: null
    });
    console.log('[LLM Interface] Download cancelled, returning to model selection');
  }

  /**
   * Destroys the adapter and cleans up resources.
   * Note: Does not touch background downloads.
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
      geminiNanoAvailable: this.state.geminiNanoAvailable, // Preserve detection result
      backgroundDownloads: this.state.backgroundDownloads // Preserve background downloads
    });
  }
}

/**
 * Singleton instance of the LLM interface.
 */
export const llm = new LLMInterface();
