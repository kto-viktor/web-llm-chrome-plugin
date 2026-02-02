/**
 * WebLLM adapter for running LLM models locally via WebGPU.
 * Supports Qwen (default) and DeepSeek models.
 * @module core/webllm-adapter
 */

import * as webllm from '@mlc-ai/web-llm';

/**
 * Available WebLLM models configuration.
 * Set modelUrl to use a custom CDN, or leave undefined for default HuggingFace.
 *
 * Default HuggingFace URLs:
 * - Qwen: https://huggingface.co/mlc-ai/Qwen2.5-7B-Instruct-q4f16_1-MLC/resolve/main/
 * - DeepSeek: https://huggingface.co/mlc-ai/DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC/resolve/main/
 */
export const WEBLLM_MODELS = {
  llama: {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'webllm-llama',
    displayName: 'Llama 3.2 1B (WebLLM)',
    modelUrl: 'https://local-llms.s3-accelerate.amazonaws.com/Llama-3.2-1B-Instruct-q4f16_1-MLC/'
  },
  qwen: {
    id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    name: 'webllm-qwen',
    displayName: 'Qwen 2.5 7B (WebLLM)',
    modelUrl: 'https://local-llms.s3-accelerate.amazonaws.com/Qwen2.5-7B-Instruct-q4f16_1-MLC/'
  },
  deepseek: {
    id: 'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC',
    name: 'webllm-deepseek',
    displayName: 'DeepSeek-R1 (WebLLM)',
    modelUrl: 'https://local-llms.s3-accelerate.amazonaws.com/DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC/'
  }
};

/**
 * Adapter for WebLLM models.
 */
export class WebLLMAdapter {
  /**
   * Creates a WebLLM adapter.
   * @param {'llama'|'qwen'|'deepseek'} [modelKey='qwen'] - The model key to use
   */
  constructor(modelKey = 'qwen') {
    const config = WEBLLM_MODELS[modelKey];
    if (!config) {
      throw new Error(`Unknown WebLLM model: ${modelKey}`);
    }

    /** @type {string} */
    this.modelId = config.id;
    /** @type {string} */
    this.modelName = config.name;
    /** @type {string} */
    this.displayModelName = config.displayName;
    /** @type {string|undefined} */
    this.modelUrl = config.modelUrl;
    /** @type {Object|null} */
    this.engine = null;
    /** @type {boolean} */
    this.initialized = false;
    /** @type {boolean} */
    this.downloading = false;
    /** @type {boolean} */
    this.cancelled = false;
  }

  /**
   * Gets the model name.
   * @returns {string} The model identifier
   */
  getName() {
    return this.modelName;
  }

  /**
   * Gets a human-readable model display name.
   * @returns {string} The display name
   */
  getDisplayName() {
    return this.displayModelName;
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
    this.cancelled = false;

    try {
      const initProgressCallback = (report) => {
        // Check if cancelled
        if (this.cancelled) {
          throw new Error('Download cancelled');
        }

        if (onProgress) {
          // Customize the download text
          let customText = report.text || 'Initializing...';
          let isFromCache = false;

          // Detect if loading from cache or downloading from internet
          if (customText.includes('Fetching param cache')) {
            // Downloading from internet
            const percent = Math.round((report.progress || 0) * 100);
            customText = `Downloading model... ${percent}%`;
            isFromCache = false;
          } else if (customText.includes('Start to fetch params')) {
            customText = `Connecting to CDN to download model...`
            // TODO: here add some progressbar, which just takes approximately 10 seconds
            isFromCache = false;
          } else if (customText.includes('Loading model from cache') ||
                     customText.includes('Loading GPU') ||
                     customText.includes('Finish loading')) {
            // Loading from local cache/disk
            customText = 'Loading from your device...';
            isFromCache = true;
          } else {
            customText = 'Preparing model...';
            isFromCache = true; // Assume cache for other init stages
          }

          onProgress({
            progress: report.progress || 0,
            text: customText,
            isFromCache
          });
        }
      };

      // Build engine options
      const engineOptions = { initProgressCallback };

      // Use custom CDN URL if specified
      if (this.modelUrl) {
        const defaultConfig = webllm.prebuiltAppConfig.model_list.find(
          m => m.model_id === this.modelId
        );

        if (defaultConfig) {
          engineOptions.appConfig = {
            model_list: [{
              ...defaultConfig,
              model: this.modelUrl
            }]
          };
          console.log(`[WebLLM] Using custom model URL: ${this.modelUrl}`);
        }
      }

      this.engine = await webllm.CreateMLCEngine(this.modelId, engineOptions);

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
   * Summarizes text using prompt-based approach.
   * WebLLM doesn't have a native Summarizer, so we use the chat API.
   * @param {string} text - The text to summarize
   * @param {Object} [options] - Summarization options
   * @param {Function} [options.onToken] - Callback for streaming tokens
   * @returns {Promise<string>} The summary
   */
  async summarize(text, options = {}) {
    const prompt = `Summarize the following text concisely, preserving key facts and context. Keep it under 200 words:\n\n${text}`;
    return this.generate(prompt, options);
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
   * Cancels the current download.
   */
  cancel() {
    this.cancelled = true;
    this.downloading = false;
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
