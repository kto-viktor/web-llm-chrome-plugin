/**
 * WebLLM adapter for running LLM models locally via WebGPU.
 * Supports 4 models: Gemma 2B, Hermes 3B (default), DeepSeek 8B, Llama 70B.
 * @module core/webllm-adapter
 */

import * as webllm from '@mlc-ai/web-llm';

/**
 * Available WebLLM models configuration.
 * Set modelUrl to use a custom CDN, or leave undefined for default HuggingFace.
 *
 * Models (ordered by size):
 * - Gemma 2 2B: Compact, capable (2.5 GB)
 * - Hermes 3 3B: Balanced, smart - default (2.9 GB)
 * - DeepSeek-R1 8B: Deep thinking (4.5 GB)
 * - Llama 3.1 70B: Most powerful (31 GB)
 */
export const WEBLLM_MODELS = {
  gemma: {
    id: 'gemma-2-2b-it-q4f32_1-MLC',
    name: 'webllm-gemma',
    displayName: 'Gemma 2 2B (WebLLM)',
    modelUrl: 'https://local-llms.s3-accelerate.amazonaws.com/gemma-2-2b-it-q4f32_1-MLC/'
  },
  hermes: {
    id: 'Hermes-3-Llama-3.2-3B-q4f32_1-MLC',
    name: 'webllm-hermes',
    displayName: 'Hermes 3 3B (WebLLM)',
    modelUrl: 'https://local-llms.s3-accelerate.amazonaws.com/Hermes-3-Llama-3.2-3B-q4f32_1-MLC/'
  },
  deepseek: {
    id: 'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC',
    name: 'webllm-deepseek',
    displayName: 'DeepSeek-R1 (WebLLM)',
    modelUrl: 'https://local-llms.s3-accelerate.amazonaws.com/DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC/'
  },
  llama70b: {
    id: 'Llama-3.1-70B-Instruct-q3f16_1-MLC',
    name: 'webllm-llama70b',
    displayName: 'Llama 3.1 70B (WebLLM)',
    //modelUrl: 'https://local-llms.s3-accelerate.amazonaws.com/Llama-3.1-70B-Instruct-q3f16_1-MLC/'
  }
};

/**
 * Adapter for WebLLM models.
 */
export class WebLLMAdapter {
  /**
   * Creates a WebLLM adapter.
   * @param {'gemma'|'hermes'|'deepseek'|'llama70b'} [modelKey='hermes'] - The model key to use
   */
  constructor(modelKey = 'hermes') {
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
    /** @type {boolean} */
    this.generating = false;
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
          console.log("[LOADING]: " + customText);

          if (customText.includes('Fetching param cache')) {
            const percent = Math.round((report.progress || 0) * 100);
            customText = `Downloading model... ${percent}%`;
          } else if (customText.includes('Start to fetch params')) {
            customText = 'Loading model...';
          } else if (customText.includes('Loading model from cache') ||
                     customText.includes('Loading GPU') ||
                     customText.includes('Finish loading')) {
            customText = 'Loading from your device...';
          } else {
            customText = 'Preparing model...';
          }

          onProgress({
            progress: report.progress || 0,
            text: customText
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
      const isGpuError = /maxStorageBuffers|exceeds limit|WebGPU|out of memory|GPU buffer/i.test(error.message);
      const wrappedError = new Error(
        isGpuError
          ? 'Your device doesn\'t have enough GPU power to run this model.'
          : `Failed to initialize WebLLM: ${error.message}`
      );
      wrappedError.type = isGpuError ? 'INSUFFICIENT_GPU' : 'INITIALIZATION_ERROR';
      throw wrappedError;
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
    if (!this.initialized || !this.engine) {
      throw new Error('WebLLM not initialized. Call initialize() first.');
    }

    if (this.generating) {
      console.warn('[WebLLM] Generation stuck, needs engine reload');
      this.generating = false;
      throw new Error('ENGINE_STUCK');
    }

    const { onToken, signal } = options;

    if (onToken) {
      return this.generateStreaming(messages, onToken, signal);
    }

    this.generating = true;
    try {
      console.log('[WebLLM] Starting non-streaming generation...');
      const response = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 2048
      });

      console.log('[WebLLM] Non-streaming generation completed');
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.log('[WebLLM] Non-streaming generation error:', error.message);
      throw new Error(`Generation failed: ${error.message}`);
    } finally {
      this.generating = false;
    }
  }

  /**
   * Generates a streaming response.
   * @param {Array} messages - The chat messages
   * @param {Function} onToken - Callback for each token
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<string>} The complete response
   */
  async generateStreaming(messages, onToken, signal) {
    // Check if already aborted before starting
    if (signal?.aborted) {
      console.log('[WebLLM] Generation aborted before start');
      throw new Error('Generation cancelled');
    }

    this.generating = true;
    console.log('[WebLLM] Set generating=true');

    let aborted = false;
    const abortHandler = () => {
      console.log('[WebLLM] Abort signal received');
      aborted = true;
    };

    // Listen for abort events
    if (signal) {
      signal.addEventListener('abort', abortHandler);
    }

    try {
      console.log('[WebLLM] Starting streaming generation...');
      const stream = await this.engine.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
      });

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        // Check if generation was cancelled
        if (aborted) {
          console.log('[WebLLM] Generation cancelled during streaming (chunk: ' + chunkCount + ')');
          throw new Error('Generation cancelled');
        }

        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullResponse += delta;
          chunkCount++;
          onToken(delta);
        }
      }

      console.log('[WebLLM] Streaming completed (' + chunkCount + ' chunks, ' + fullResponse.length + ' chars)');
      return fullResponse;
    } catch (error) {
      console.log('[WebLLM] Streaming error:', error.message);
      if (error.message === 'Generation cancelled') {
        // Don't reset chat state - it causes the engine to hang on next request
        // Just throw the error and let the engine recover naturally
        console.log('[WebLLM] Cancelled, letting engine recover naturally (no resetChat)');
        throw error;
      }
      throw new Error(`Streaming generation failed: ${error.message}`);
    } finally {
      // Clean up abort listener
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      this.generating = false;
      console.log('[WebLLM] Set generating=false');
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
    const messages = [
      { role: 'user', content: `Summarize the following text concisely, preserving key facts and context. Keep it under 200 words:\n\n${text}` }
    ];
    return this.generate(messages, options);
  }

  /**
   * Interrupts the current generation.
   * This is the official WebLLM way to cancel generation.
   * @returns {Promise<void>}
   */
  async interrupt() {
    if (this.engine && this.generating) {
      console.log('[WebLLM] Calling interruptGenerate() (generating=' + this.generating + ')...');
      try {
        // Just call interrupt and return immediately - don't wait
        // The streaming loop will detect the interruption and exit
        await this.engine.interruptGenerate();
        console.log('[WebLLM] interruptGenerate() call completed');
      } catch (error) {
        console.error('[WebLLM] Interrupt error:', error.message);
      }
    } else {
      console.log('[WebLLM] Interrupt called but not generating (generating=' + this.generating + ')');
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
