/**
 * Detects available AI models in the browser.
 * @module core/model-detector
 */

/**
 * Model availability status.
 * @typedef {Object} ModelStatus
 * @property {boolean} available - Whether the model is available
 * @property {string} [reason] - Reason if not available
 */

/**
 * Detection result for all models.
 * @typedef {Object} DetectionResult
 * @property {boolean} geminiNanoAvailable - Whether Gemini Nano is available
 * @property {boolean} summarizerAvailable - Whether Summarizer API is available
 * @property {boolean} webLLMSupported - Whether WebLLM can be used
 * @property {string} recommendedModel - The recommended model to use
 * @property {string} [geminiNanoReason] - Reason if Gemini Nano is not available
 */

/**
 * Checks if Gemini Nano (Chrome's built-in AI) Prompt API is available.
 * Uses the global LanguageModel class.
 * @returns {Promise<ModelStatus>} The availability status
 */
export async function checkGeminiNano() {
  const checks = {
    browserContext: false,
    languageModelExists: false,
    promptApiAvailable: false,
    promptApiStatus: null
  };

  // Check 1: Browser context
  if (typeof self === 'undefined') {
    console.log('[Gemini Nano] Check failed: Not in browser context');
    return { available: false, reason: 'Not in browser context', checks };
  }
  checks.browserContext = true;
  console.log('[Gemini Nano] Browser context: OK');

  // Check 2: LanguageModel class exists
  if (typeof LanguageModel === 'undefined') {
    console.log('[Gemini Nano] LanguageModel class not found');
    return { available: false, reason: 'LanguageModel API not available', checks };
  }
  checks.languageModelExists = true;
  console.log('[Gemini Nano] LanguageModel class: OK');

  // Check 3: Prompt API availability status
  try {
    const availability = await LanguageModel.availability();
    checks.promptApiStatus = availability;
    checks.promptApiAvailable = availability === 'available' || availability === 'readily';
    console.log(`[Gemini Nano] Prompt API availability: ${availability}`);
  } catch (error) {
    console.log(`[Gemini Nano] Prompt API check error: ${error.message}`);
    checks.promptApiStatus = `error: ${error.message}`;
    return { available: false, reason: `Prompt API error: ${error.message}`, checks };
  }

  // Log summary
  console.log('[Gemini Nano] Detection summary:', checks);

  // Determine availability
  if (!checks.promptApiAvailable) {
    const reason = checks.promptApiStatus === 'after-download'
      ? 'Gemini Nano requires download (will download on first use)'
      : `Prompt API status: ${checks.promptApiStatus}`;
    // Still return available for 'after-download' - it will download when needed
    if (checks.promptApiStatus === 'after-download') {
      console.log('[Gemini Nano] Model will download on first use');
      return { available: true, needsDownload: true, checks };
    }
    return { available: false, reason, checks };
  }

  console.log('[Gemini Nano] Prompt API is available');
  return { available: true, checks };
}

/**
 * Checks if the Summarizer API is available.
 * @returns {Promise<ModelStatus>} The availability status
 */
export async function checkSummarizer() {
  const checks = {
    summarizerExists: false,
    summarizerAvailable: false,
    summarizerStatus: null
  };

  // Check 1: Summarizer class exists
  if (typeof Summarizer === 'undefined') {
    console.log('[Summarizer] Summarizer class not found');
    return { available: false, reason: 'Summarizer API not available', checks };
  }
  checks.summarizerExists = true;
  console.log('[Summarizer] Summarizer class: OK');

  // Check 2: Summarizer availability status
  try {
    const availability = await Summarizer.availability();
    checks.summarizerStatus = availability;
    checks.summarizerAvailable = availability === 'available' || availability === 'readily';
    console.log(`[Summarizer] Availability: ${availability}`);
  } catch (error) {
    console.log(`[Summarizer] Availability check error: ${error.message}`);
    checks.summarizerStatus = `error: ${error.message}`;
    return { available: false, reason: `Summarizer error: ${error.message}`, checks };
  }

  // Log summary
  console.log('[Summarizer] Detection summary:', checks);

  if (!checks.summarizerAvailable) {
    if (checks.summarizerStatus === 'after-download') {
      console.log('[Summarizer] Model will download on first use');
      return { available: true, needsDownload: true, checks };
    }
    return { available: false, reason: `Summarizer status: ${checks.summarizerStatus}`, checks };
  }

  console.log('[Summarizer] Summarizer API is available');
  return { available: true, checks };
}

/**
 * Checks if WebLLM can be used in this browser.
 * Requires WebGPU support.
 * @returns {Promise<ModelStatus>} The availability status
 */
export async function checkWebLLMSupport() {
  if (typeof navigator === 'undefined') {
    return { available: false, reason: 'Not in browser context' };
  }

  if (!('gpu' in navigator)) {
    return { available: false, reason: 'WebGPU not supported' };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { available: false, reason: 'No WebGPU adapter found' };
    }
    return { available: true };
  } catch (error) {
    return { available: false, reason: `WebGPU error: ${error.message}` };
  }
}

/**
 * Detects all available models and recommends the best one.
 * @returns {Promise<DetectionResult>} The detection result
 */
export async function detectModels() {
  console.log('[Model Detector] Starting model detection...');

  const [geminiStatus, summarizerStatus, webLLMStatus] = await Promise.all([
    checkGeminiNano(),
    checkSummarizer(),
    checkWebLLMSupport()
  ]);

  let recommendedModel = 'none';

  if (geminiStatus.available) {
    recommendedModel = 'gemini-nano';
  } else if (webLLMStatus.available) {
    recommendedModel = 'webllm';
  }

  const result = {
    geminiNanoAvailable: geminiStatus.available,
    geminiNanoNeedsDownload: geminiStatus.needsDownload || false,
    summarizerAvailable: summarizerStatus.available,
    summarizerNeedsDownload: summarizerStatus.needsDownload || false,
    webLLMSupported: webLLMStatus.available,
    recommendedModel,
    geminiNanoReason: geminiStatus.reason,
    summarizerReason: summarizerStatus.reason
  };

  console.log('[Model Detector] Detection result:', result);
  return result;
}
