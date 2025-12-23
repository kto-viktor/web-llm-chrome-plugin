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
 * @property {boolean} webLLMSupported - Whether WebLLM can be used
 * @property {string} recommendedModel - The recommended model to use
 * @property {string} [geminiNanoReason] - Reason if Gemini Nano is not available
 */

/**
 * Checks if Gemini Nano (Chrome's built-in AI) is available:
 1. checks for Prompt API availability:
 const availability = await LanguageModel.availability();
 2. checks for Summarizer API availability:
 if ('Summarizer' in self) {
   // The Summarizer API is supported.
 }
 3. logging all checks
 4. if 1 and 2 check passed, then choses gemini nano as default model.
 * @returns {Promise<ModelStatus>} The availability status
 */
export async function checkGeminiNano() {
  const checks = {
    browserContext: false,
    promptApiExists: false,
    promptApiAvailable: false,
    promptApiStatus: null,
    summarizerApiExists: false
  };

  // Check 1: Browser context
  if (typeof self === 'undefined') {
    console.log('[Gemini Nano] Check failed: Not in browser context');
    return { available: false, reason: 'Not in browser context', checks };
  }
  checks.browserContext = true;
  console.log('[Gemini Nano] Browser context: OK');

  // Check 2: Prompt API (LanguageModel) availability
  const hasLanguageModel = 'ai' in self && 'languageModel' in self.ai;
  checks.promptApiExists = hasLanguageModel;
  console.log(`[Gemini Nano] Prompt API exists: ${hasLanguageModel}`);

  try {
    const availability = await self.ai.languageModel.availability();
    checks.promptApiStatus = availability;
    checks.promptApiAvailable = availability === 'available' || availability === 'readily';
    console.log(`[Gemini Nano] Prompt API availability: ${availability}`);
  } catch (error) {
    console.log(`[Gemini Nano] Prompt API check error: ${error.message}`);
    checks.promptApiStatus = `error: ${error.message}`;
  }

  // Check 3: Summarizer API availability
  checks.summarizerApiExists = 'ai' in self && 'summarizer' in self.ai;
  console.log(`[Gemini Nano] Summarizer API exists: ${checks.summarizerApiExists}`);

  // Log summary
  console.log('[Gemini Nano] Detection summary:', checks);

  // Check 4: Determine if Gemini Nano is available
  // Require Prompt API to be available; Summarizer is optional but logged
  if (!checks.promptApiExists) {
    return { available: false, reason: 'Prompt API (LanguageModel) not available', checks };
  }

  if (!checks.promptApiAvailable) {
    const reason = checks.promptApiStatus === 'after-download'
      ? 'Gemini Nano requires download first (enable in chrome://flags)'
      : `Prompt API status: ${checks.promptApiStatus}`;
    return { available: false, reason, checks };
  }

  console.log('[Gemini Nano] All checks passed - Gemini Nano is available');
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
  const [geminiStatus, webLLMStatus] = await Promise.all([
    checkGeminiNano(),
    checkWebLLMSupport()
  ]);

  let recommendedModel = 'none';

  if (geminiStatus.available) {
    recommendedModel = 'gemini-nano';
  } else if (webLLMStatus.available) {
    recommendedModel = 'webllm';
  }

  return {
    geminiNanoAvailable: geminiStatus.available,
    webLLMSupported: webLLMStatus.available,
    recommendedModel,
    geminiNanoReason: geminiStatus.reason
  };
}
