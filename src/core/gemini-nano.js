/**
 * Gemini Nano adapter for Chrome's built-in AI.
 * @module core/gemini-nano
 */

/**
 * Adapter for Chrome's built-in Gemini Nano model.
 */
export class GeminiNanoAdapter {
  constructor() {
    /** @type {Object|null} */
    this.session = null;
    /** @type {boolean} */
    this.initialized = false;
  }

  /**
   * Gets the model name.
   * @returns {string} The model identifier
   */
  getName() {
    return 'gemini-nano';
  }

  /**
   * Gets a human-readable model display name.
   * @returns {string} The display name
   */
  getDisplayName() {
    return 'Gemini Nano (Chrome Built-in)';
  }

  /**
   * Initializes the Gemini Nano session.
   * @param {Function} [onProgress] - Optional progress callback (not used for Gemini Nano)
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async initialize(onProgress) {
    if (this.initialized && this.session) {
      return;
    }

    if (!('ai' in window) || !('languageModel' in window.ai)) {
      throw new Error('Gemini Nano not available in this browser');
    }

    try {
      this.session = await window.ai.languageModel.create({
        systemPrompt: 'You are a helpful AI assistant. Be concise and helpful.'
      });
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to create Gemini Nano session: ${error.message}`);
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
    if (!this.initialized || !this.session) {
      await this.initialize();
    }

    const { onToken } = options;

    if (onToken) {
      return this.generateStreaming(prompt, onToken);
    }

    try {
      const response = await this.session.prompt(prompt);
      return response;
    } catch (error) {
      throw new Error(`Generation failed: ${error.message}`);
    }
  }

  /**
   * Generates a streaming response.
   * @param {string} prompt - The user prompt
   * @param {Function} onToken - Callback for each token
   * @returns {Promise<string>} The complete response
   */
  async generateStreaming(prompt, onToken) {
    if (!this.initialized || !this.session) {
      await this.initialize();
    }

    try {
      const stream = await this.session.promptStreaming(prompt);
      let fullResponse = '';
      let previousLength = 0;

      for await (const chunk of stream) {
        const newContent = chunk.slice(previousLength);
        previousLength = chunk.length;
        fullResponse = chunk;

        if (newContent && onToken) {
          onToken(newContent);
        }
      }

      return fullResponse;
    } catch (error) {
      throw new Error(`Streaming generation failed: ${error.message}`);
    }
  }

  /**
   * Checks if the model is ready to use.
   * @returns {boolean} Whether the model is initialized
   */
  isReady() {
    return this.initialized && this.session !== null;
  }

  /**
   * Destroys the session and cleans up resources.
   */
  async destroy() {
    if (this.session) {
      try {
        await this.session.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
      this.session = null;
    }
    this.initialized = false;
  }
}
