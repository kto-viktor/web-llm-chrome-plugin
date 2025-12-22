/**
 * WebLLM adapter for running DeepSeek-R1 locally via WebGPU.
 * @module core/webllm-adapter
 */

import * as webllm from '@mlc-ai/web-llm';

/**
 * The DeepSeek-R1 model ID for WebLLM.
 */
const MODEL_ID = 'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC';

/**
 * Adapter for WebLLM with DeepSeek-R1 model.
 */
export class WebLLMAdapter {
  constructor() {
    /** @type {Object|null} */
    this.engine = null;
    /** @type {boolean} */
    this.initialized = false;
    /** @type {boolean} */
    this.downloading = false;
  }

  /**
   * Gets the model name.
   * @returns {string} The model identifier
   */
  getName() {
    return 'webllm-deepseek';
  }

  /**
   * Gets a human-readable model display name.
   * @returns {string} The display name
   */
  getDisplayName() {
    return 'DeepSeek-R1 (WebLLM)';
  }

  /**
   * Initializes the WebLLM engine and loads the model.
   * @param {Function} [onProgress] - Progress callback (receives { progress: 0-1, text: string })
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async initialize(onProgress) {
    if (this.initialized && this.engine) {
      return;
    }

    if (this.downloading) {
      throw new Error('Model download already in progress');
    }

    this.downloading = true;

    try {
      const initProgressCallback = (report) => {
        if (onProgress) {
          onProgress({
            progress: report.progress || 0,
            text: report.text || 'Initializing...'
          });
        }
      };

      this.engine = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback
      });

      this.initialized = true;
      this.downloading = false;
    } catch (error) {
      this.downloading = false;
      throw new Error(`Failed to initialize WebLLM: ${error.message}`);
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
    if (!this.initialized || !this.engine) {
      throw new Error('WebLLM not initialized. Call initialize() first.');
    }

    const { onToken } = options;

    const messages = [
      { role: 'user', content: prompt }
    ];

    if (onToken) {
      return this.generateStreaming(messages, onToken);
    }

    try {
      const response = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 2048
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`Generation failed: ${error.message}`);
    }
  }

  /**
   * Generates a streaming response.
   * @param {Array} messages - The chat messages
   * @param {Function} onToken - Callback for each token
   * @returns {Promise<string>} The complete response
   */
  async generateStreaming(messages, onToken) {
    try {
      const stream = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullResponse += delta;
          onToken(delta);
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
    return this.initialized && this.engine !== null;
  }

  /**
   * Checks if model is currently downloading.
   * @returns {boolean} Whether download is in progress
   */
  isDownloading() {
    return this.downloading;
  }

  /**
   * Resets the chat state.
   */
  async resetChat() {
    if (this.engine) {
      await this.engine.resetChat();
    }
  }

  /**
   * Destroys the engine and cleans up resources.
   */
  async destroy() {
    if (this.engine) {
      try {
        await this.engine.unload();
      } catch (e) {
        // Ignore unload errors
      }
      this.engine = null;
    }
    this.initialized = false;
    this.downloading = false;
  }
}
