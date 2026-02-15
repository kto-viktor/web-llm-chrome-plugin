/**
 * ViewState computation utility.
 * Provides a single source of truth for which screen should be displayed.
 */

import type { ViewState } from '../types';
import type { ModelState } from './modelState';

/**
 * Computes which screen to show based on the selected model's state.
 * This is the key change: derive UI from user's selection, not global LLM state.
 *
 * @param selectedModel - The model the user has selected (or null if none)
 * @param pendingDownload - Model key awaiting download confirmation (or null)
 * @param modelState - The state of the selected model (or null if no selection)
 * @returns ViewState object indicating which screen to display
 */
export function computeViewState(
  selectedModel: string | null,
  pendingDownload: string | null,
  modelState: ModelState | null
): ViewState {
  // No model selected yet - show welcome screen
  if (!selectedModel) {
    return { screen: 'welcome' };
  }

  // User is confirming download for this model
  if (pendingDownload === selectedModel) {
    return { screen: 'download-confirm', modelKey: selectedModel };
  }

  // No model state - shouldn't happen, but fallback
  if (!modelState) {
    return { screen: 'welcome' };
  }

  // Gemini unavailable - show setup instructions
  if (modelState.type === 'gemini-unavailable') {
    return { screen: 'gemini-setup' };
  }

  // Downloading from network (not cached locally) - show full download screen
  if (modelState.type === 'downloading' && modelState.isFromCache === false) {
    return { screen: 'downloading', modelKey: selectedModel };
  }

  // Downloading in background (not cached locally) - show download screen for this model
  if (modelState.type === 'downloading-background' && modelState.isFromCache === false) {
    return { screen: 'downloading', modelKey: selectedModel };
  }

  // Ready, cached, or loading from cache - show chat screen
  // This handles:
  // - Model is active and ready
  // - Model is cached (will load quickly)
  // - Model is loading from cache (fast, show chat immediately)
  // - Model is downloading from cache in background (show chat)
  if (modelState.type === 'ready' ||
      modelState.type === 'cached' ||
      (modelState.type === 'downloading' && modelState.isFromCache) ||
      (modelState.type === 'downloading-background' && modelState.isFromCache)) {
    return { screen: 'chat' };
  }

  // Fallback to welcome
  return { screen: 'welcome' };
}
