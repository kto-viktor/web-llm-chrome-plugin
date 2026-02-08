/**
 * Hook to detect which WebLLM models are already cached.
 */

import { useState, useEffect } from 'react';
// @ts-ignore - JS module
import { hasModelInCache, prebuiltAppConfig } from '@mlc-ai/web-llm';
// @ts-ignore - JS module
import { WEBLLM_MODELS } from '../../core/webllm-adapter.js';

export function useCachedModels() {
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkCachedModels() {
      try {
        const cached = new Set<string>();

        // Check each model
        const [llamaCached, gemmaCached, hermesCached, deepseekCached, llama70bCached] =
          await Promise.all([
            hasModelInCache(WEBLLM_MODELS.llama.id, prebuiltAppConfig),
            hasModelInCache(WEBLLM_MODELS.gemma.id, prebuiltAppConfig),
            hasModelInCache(WEBLLM_MODELS.hermes.id, prebuiltAppConfig),
            hasModelInCache(WEBLLM_MODELS.deepseek.id, prebuiltAppConfig),
            hasModelInCache(WEBLLM_MODELS.llama70b.id, prebuiltAppConfig),
          ]);

        if (llamaCached) cached.add('webllm-llama');
        if (gemmaCached) cached.add('webllm-gemma');
        if (hermesCached) cached.add('webllm-hermes');
        if (deepseekCached) cached.add('webllm-deepseek');
        if (llama70bCached) cached.add('webllm-llama70b');

        setCachedModels(cached);
      } catch (error) {
        console.error('[useCachedModels] Error checking cached models:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkCachedModels();
  }, []);

  return { cachedModels, isChecking };
}
