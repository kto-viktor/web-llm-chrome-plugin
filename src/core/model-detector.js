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
 * Checks if Gemini Nano (Chrome's built-in AI) is available.
 * @returns {Promise<ModelStatus>} The availability status
 */
export async function checkGeminiNano() {
  if (typeof window === 'undefined') {
    return { available: false, reason: 'Not in browser context' };
  }

  if (!('ai' in window)) {
    return { available: false, reason: 'Chrome AI API not available' };
  }

  if (!('languageModel' in window.ai)) {
    return { available: false, reason: 'Language model API not available' };
  }

  try {
    const capabilities = await window.ai.languageModel.capabilities();

    if (capabilities.available === 'no') {
      return { available: false, reason: 'Gemini Nano not available on this device' };
    }

    if (capabilities.available === 'after-download') {
      return { available: false, reason: 'Gemini Nano requires download first' };
    }

    return { available: true };
  } catch (error) {
    return { available: false, reason: `Error checking capabilities: ${error.message}` };
  }
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
