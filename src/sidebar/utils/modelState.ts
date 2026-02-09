/**
 * Model state utilities.
 * Provides functions to determine the state of any specific model.
 */

import type { LLMState } from '../types';

/**
 * Represents the state of a specific model.
 */
export type ModelState =
  | { type: 'ready' }
  | { type: 'downloading'; isFromCache: boolean | null }
  | { type: 'downloading-background'; isFromCache: boolean | null }
  | { type: 'cached' }
  | { type: 'gemini-unavailable' }
  | { type: 'not-downloaded' };

/**
 * Gets the current state of a specific model.
 * This allows us to know what screen to show when user selects that model.
 *
 * @param modelKey - The model key to check (e.g., 'webllm-llama')
 * @param llmState - Current LLM state
 * @param cachedModels - Set of models that are cached on disk
 * @returns ModelState object indicating the model's current state
 */
export function getModelState(
  modelKey: string,
  llmState: LLMState,
  cachedModels: Set<string>
): ModelState {
  // Is it the active ready model?
  if (llmState.status === 'ready' && llmState.modelName === modelKey) {
    return { type: 'ready' };
  }

  // Is it actively downloading in foreground?
  if (llmState.status === 'downloading' && llmState.modelName === modelKey) {
    return { type: 'downloading', isFromCache: llmState.isFromCache };
  }

  // Is it downloading in background?
  const bgDownload = llmState.backgroundDownloads.find(d => d.modelName === modelKey);
  if (bgDownload) {
    return { type: 'downloading-background', isFromCache: bgDownload.isFromCache };
  }

  // Is it cached on disk?
  if (cachedModels.has(modelKey)) {
    return { type: 'cached' };
  }

  // Is it Gemini without availability?
  if (modelKey === 'gemini-nano' && !llmState.geminiNanoAvailable) {
    return { type: 'gemini-unavailable' };
  }

  // Not downloaded
  return { type: 'not-downloaded' };
}
