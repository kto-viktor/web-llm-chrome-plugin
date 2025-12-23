/**
 * Summarizer adapter for Chrome's built-in Summarizer API.
 * Provides optimized text summarization using Gemini Nano.
 * @module core/summarizer
 */

/**
 * Adapter for Chrome's built-in Summarizer API.
 */
export class SummarizerAdapter {
  constructor() {
    /** @type {Object|null} */
    this.summarizer = null;
    /** @type {boolean} */
    this.initialized = false;
  }

  /**
   * Checks if Summarizer API is available in the browser.
   * @returns {boolean} Whether Summarizer class exists
   */
  static isSupported() {
    return typeof Summarizer !== 'undefined';
  }

  /**
   * Checks Summarizer availability status.
   * @returns {Promise<string>} Availability status
   */
  static async checkAvailability() {
    if (!SummarizerAdapter.isSupported()) {
      return 'unavailable';
    }
    try {
      return await Summarizer.availability();
    } catch (error) {
      console.error('[Summarizer] Availability check failed:', error);
      return 'unavailable';
    }
  }

  /**
   * Initializes the Summarizer.
   * @param {Object} [options] - Summarizer options
   * @param {string} [options.type='tl;dr'] - Summary type: 'key-points', 'tl;dr', 'teaser', 'headline'
   * @param {string} [options.length='medium'] - Summary length: 'short', 'medium', 'long'
   * @param {string} [options.format='plain-text'] - Output format: 'markdown', 'plain-text'
   * @param {Function} [options.onProgress] - Progress callback for download
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    if (this.initialized && this.summarizer) {
      console.log('[Summarizer] Already initialized');
      return;
    }

    console.log('[Summarizer] Starting initialization...');

    if (!SummarizerAdapter.isSupported()) {
      throw new Error('Summarizer API not available in this browser');
    }

    try {
      const availability = await Summarizer.availability();
      console.log(`[Summarizer] Availability: ${availability}`);

      if (availability === 'unavailable') {
        throw new Error('Summarizer is not available on this device');
      }

      const createOptions = {
        type: options.type || 'tl;dr',
        length: options.length || 'medium',
        format: options.format || 'plain-text'
      };

      // Add download progress monitoring
      if (options.onProgress) {
        createOptions.monitor = (m) => {
          m.addEventListener('downloadprogress', (e) => {
            options.onProgress({
              progress: e.loaded,
              text: `Downloading Summarizer... ${Math.round(e.loaded * 100)}%`
            });
          });
        };
      }

      console.log('[Summarizer] Creating summarizer with options:', createOptions);
      this.summarizer = await Summarizer.create(createOptions);
      this.initialized = true;
      console.log('[Summarizer] Initialization complete');
    } catch (error) {
      console.error('[Summarizer] Initialization failed:', error);
      throw new Error(`Failed to create Summarizer: ${error.message}`);
    }
  }

  /**
   * Summarizes the given text.
   * @param {string} text - The text to summarize
   * @param {Object} [options] - Summarization options
   * @param {string} [options.context] - Additional context for summarization
   * @returns {Promise<string>} The summary
   */
  async summarize(text, options = {}) {
    if (!this.initialized || !this.summarizer) {
      await this.initialize();
    }

    try {
      console.log(`[Summarizer] Summarizing ${text.length} characters...`);
      const summary = await this.summarizer.summarize(text, {
        context: options.context
      });
      console.log(`[Summarizer] Generated summary: ${summary.length} characters`);
      return summary;
    } catch (error) {
      console.error('[Summarizer] Summarization failed:', error);
      throw new Error(`Summarization failed: ${error.message}`);
    }
  }

  /**
   * Summarizes text with streaming output.
   * @param {string} text - The text to summarize
   * @param {Function} onToken - Callback for each token/chunk
   * @param {Object} [options] - Summarization options
   * @returns {Promise<string>} The complete summary
   */
  async summarizeStreaming(text, onToken, options = {}) {
    if (!this.initialized || !this.summarizer) {
      await this.initialize();
    }

    try {
      console.log(`[Summarizer] Streaming summarization of ${text.length} characters...`);
      const stream = this.summarizer.summarizeStreaming(text, {
        context: options.context
      });

      let fullSummary = '';
      let previousLength = 0;

      for await (const chunk of stream) {
        // Chrome's streaming returns cumulative text, extract new content
        const newContent = chunk.slice(previousLength);
        previousLength = chunk.length;
        fullSummary = chunk;

        if (newContent && onToken) {
          onToken(newContent);
        }
      }

      console.log(`[Summarizer] Streaming complete: ${fullSummary.length} characters`);
      return fullSummary;
    } catch (error) {
      console.error('[Summarizer] Streaming summarization failed:', error);
      throw new Error(`Streaming summarization failed: ${error.message}`);
    }
  }

  /**
   * Checks if the summarizer is ready to use.
   * @returns {boolean} Whether the summarizer is initialized
   */
  isReady() {
    return this.initialized && this.summarizer !== null;
  }

  /**
   * Destroys the summarizer and cleans up resources.
   */
  async destroy() {
    if (this.summarizer) {
      try {
        await this.summarizer.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
      this.summarizer = null;
    }
    this.initialized = false;
    console.log('[Summarizer] Destroyed');
  }
}
