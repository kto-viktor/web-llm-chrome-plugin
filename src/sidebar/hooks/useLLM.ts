/**
 * React hook for LLM interface integration.
 * Wraps llm-interface subscription with proper cleanup.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LLMState } from '../types';

// Import the singleton llm instance
// @ts-ignore - JS module
import { llm } from '../../core/llm-interface.js';

interface UseLLMResult extends LLMState {
  initialize: () => Promise<void>;
  switchModel: (modelName: string) => Promise<void>;
  cancelDownload: () => Promise<void>;
  cancelBackgroundDownload: (modelName: string) => void;
  generate: (prompt: string, options?: { onToken?: (token: string) => void }) => Promise<string>;
  isReady: () => boolean;
  isSummarizerAvailable: () => boolean;
}

/**
 * Hook to access LLM state and methods.
 */
export function useLLM(): UseLLMResult {
  const [state, setState] = useState<LLMState>(llm.getState());

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = llm.subscribe((newState: LLMState) => {
      setState(newState);
    });

    // Cleanup on unmount
    return unsubscribe;
  }, []);

  const initialize = useCallback(async () => {
    await llm.initialize();
  }, []);

  const switchModel = useCallback(async (modelName: string) => {
    await llm.switchModel(modelName);
  }, []);

  const cancelDownload = useCallback(async () => {
    await llm.cancelDownload();
  }, []);

  const cancelBackgroundDownload = useCallback((modelName: string) => {
    llm.cancelBackgroundDownload(modelName);
  }, []);

  const generate = useCallback(async (prompt: string, options?: { onToken?: (token: string) => void }) => {
    return llm.generate(prompt, options);
  }, []);

  const isReady = useCallback(() => {
    return llm.isReady();
  }, []);

  const isSummarizerAvailable = useCallback(() => {
    return llm.isSummarizerAvailable();
  }, []);

  return {
    ...state,
    initialize,
    switchModel,
    cancelDownload,
    cancelBackgroundDownload,
    generate,
    isReady,
    isSummarizerAvailable,
  };
}
