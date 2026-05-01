/**
 * WebLLM adapter for running LLM models locally via WebGPU.
 * Models with `modelUrl` use a custom CDN mirror; others use the WebLLM default config.
 * @module core/webllm-adapter
 */

import * as webllm from '@mlc-ai/web-llm';

/**
 * Removes <think>…</think> blocks from a completed response string.
 * @param {string} text
 * @returns {string}
 */
function stripThinkBlocks(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Available WebLLM models configuration.
 */
export const WEBLLM_MODELS = {
  qwen3_0_6b: {
    id: 'Qwen3-0.6B-q4f32_1-MLC',
    name: 'webllm-qwen3-0.6b',
    displayName: 'Qwen3 Light 0.6B (WebLLM)',
    modelUrl: 'https://dt2y43r3g9w82.cloudfront.net/Qwen3-0.6B-q4f32_1-MLC/'
  },
  ministral3b: {
    id: 'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC',
    name: 'webllm-ministral3b',
    displayName: 'Ministral 3B (WebLLM)',
    modelUrl: 'https://dt2y43r3g9w82.cloudfront.net/Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC/'
  },
  qwen3_4b: {
    id: 'Qwen3-4B-q4f16_1-MLC',
    name: 'webllm-qwen3-4b',
    displayName: 'Qwen3 Middle 4B (WebLLM)',
    modelUrl: 'https://dt2y43r3g9w82.cloudfront.net/Qwen3-4B-q4f16_1-MLC/'
  },
  qwen3_8b: {
    id: 'Qwen3-8B-q4f16_1-MLC',
    name: 'webllm-qwen3-8b',
    displayName: 'Qwen3 Strong 8B (WebLLM)',
    modelUrl: 'https://dt2y43r3g9w82.cloudfront.net/Qwen3-8B-q4f16_1-MLC/'
  },
  deepseek: {
    id: 'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC',
    name: 'webllm-deepseek',
    displayName: 'DeepSeek-R1 8B (WebLLM)',
    modelUrl: 'https://dt2y43r3g9w82.cloudfront.net/DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC/'
  },
  llama70b: {
    id: 'Llama-3.1-70B-Instruct-q3f16_1-MLC',
    name: 'webllm-llama70b',
    displayName: 'Llama 3.1 70B (WebLLM)',
  },
  // Added in web-llm 0.2.83 — uses default CDN (no modelUrl override)
  qwen35_9b: {
    id: 'Qwen3.5-9B-q4f16_1-MLC',
    name: 'webllm-qwen35-9b',
    displayName: 'Qwen3.5 Large 9B (WebLLM)'
  }
};

/**
 * Adapter for WebLLM models.
 */
export class WebLLMAdapter {
  /**
   * Creates a WebLLM adapter.
   * @param {keyof typeof WEBLLM_MODELS} [modelKey='qwen3_4b'] - The model key to use
   */
  constructor(modelKey = 'qwen3_4b') {
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
    /** @type {boolean} Matches Qwen3-* and Qwen3.5-* (both emit `<think>` blocks) */
    this.isQwen3 = /^Qwen3(\.\d+)?-/.test(this.modelId);
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

      // Intentional cancellation — not an error
      if (error.message === 'Download cancelled') {
        return;
      }

      const isGpuDeviceLost = /external Instance|device.*lost/i.test(error.message);
      const isShaderError = /ShaderModule|shader.?f16/i.test(error.message);
      const isGpuError = /maxStorageBuffers|exceeds limit|WebGPU|out of memory|GPU buffer/i.test(error.message);
      const isQuotaError = /quota exceeded/i.test(error.message);
      const isFetchError = /failed to fetch/i.test(error.message);
      const isNetworkCacheError = /Cache\.add\(\)|cache.*network/i.test(error.message);
      const isDisposedError = /already been disposed/i.test(error.message);

      let message;
      let type;

      if (isGpuDeviceLost) {
        message = 'Your GPU became unavailable (possibly out of memory). Please close and open extension again and try a smaller model (like qwen3-Light).';
        type = 'GPU_DEVICE_LOST';
      } else if (isShaderError) {
        message = "Your GPU doesn't support the required WebGPU features for this model. Try Qwen-3 Light?";
        type = 'INSUFFICIENT_GPU_SHADER';
      } else if (isGpuError) {
        message = "Your device doesn't have enough GPU power to run this model :( Try Qwen-3 Light?";
        type = 'INSUFFICIENT_GPU';
      } else if (isQuotaError) {
        message = "Not enough browser storage to save this model. In Chrome settings, disable 'Clear cookies and site data when you close all windows', or free up disk space.";
        type = 'NETWORK_CACHE_ERROR';
      } else if (isFetchError) {
        message = 'Could not reach the model server. Please check your internet connection and try again.';
        type = 'NETWORK_CACHE_ERROR';
      } else if (isNetworkCacheError) {
        message = 'Model download failed — check your internet connection and ensure you have enough disk space (need ~5 GB free).';
        type = 'NETWORK_CACHE_ERROR';
      } else if (isDisposedError) {
        message = 'The model ran into an internal state error. Please try again or close/open extension.';
        type = 'INITIALIZATION_ERROR';
      } else {
        message = `Failed to initialize WebLLM: ${error.message}`;
        type = 'INITIALIZATION_ERROR';
      }

      const wrappedError = new Error(message);
      wrappedError.type = type;
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
      let content = response.choices[0]?.message?.content || '';
      if (this.isQwen3) content = stripThinkBlocks(content);
      return content;
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
      let thinkBuffer = '';   // pending partial <think> tag, flushed once complete tag confirmed absent
      let inThinkBlock = false;

      for await (const chunk of stream) {
        // Check if generation was cancelled
        if (aborted) {
          console.log('[WebLLM] Generation cancelled during streaming (chunk: ' + chunkCount + ')');
          throw new Error('Generation cancelled');
        }

        const delta = chunk.choices[0]?.delta?.content || '';
        if (!delta) continue;

        if (this.isQwen3) {
          // Strip <think>…</think> blocks inline so they never reach the UI
          thinkBuffer += delta;
          let out = '';
          while (thinkBuffer.length > 0) {
            if (inThinkBlock) {
              const end = thinkBuffer.indexOf('</think>');
              if (end !== -1) {
                inThinkBlock = false;
                thinkBuffer = thinkBuffer.slice(end + '</think>'.length);
              } else {
                thinkBuffer = '';
              }
            } else {
              const start = thinkBuffer.indexOf('<think>');
              if (start !== -1) {
                out += thinkBuffer.slice(0, start);
                inThinkBlock = true;
                thinkBuffer = thinkBuffer.slice(start + '<think>'.length);
              } else {
                // Hold back chars that could be a partial opening tag
                const partial = thinkBuffer.lastIndexOf('<');
                if (partial !== -1 && '<think>'.startsWith(thinkBuffer.slice(partial))) {
                  out += thinkBuffer.slice(0, partial);
                  thinkBuffer = thinkBuffer.slice(partial);
                } else {
                  out += thinkBuffer;
                  thinkBuffer = '';
                }
                break;
              }
            }
          }
          if (out) {
            fullResponse += out;
            chunkCount++;
            onToken(out);
          }
        } else {
          fullResponse += delta;
          chunkCount++;
          onToken(delta);
        }
      }

      // Flush any buffered content that turned out not to be a think tag
      if (thinkBuffer && !inThinkBlock) {
        fullResponse += thinkBuffer;
        onToken(thinkBuffer);
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
