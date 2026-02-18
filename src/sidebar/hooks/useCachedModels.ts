/**
 * Hook to detect which WebLLM models are already downloaded.
 * Uses localStorage to track downloaded models since hasModelInCache is unreliable.
 */

import { useState, useEffect, useCallback } from 'react';
// @ts-ignore - JS module
import { hasModelInCache, prebuiltAppConfig } from '@mlc-ai/web-llm';
// @ts-ignore - JS module
import { WEBLLM_MODELS } from '../../core/webllm-adapter.js';

const DOWNLOADED_MODELS_KEY = 'llm-downloaded-models';
const MIGRATION_DONE_KEY = 'llm-cache-migration-done';

export function useCachedModels() {
  const [cachedModels, setCachedModels] = useState<Set<string>>(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(DOWNLOADED_MODELS_KEY);
      if (stored) {
        const models = JSON.parse(stored);
        console.log('[useCachedModels] Loaded from localStorage:', models);
        return new Set(models);
      }
    } catch (error) {
      console.error('[useCachedModels] Error loading from localStorage:', error);
    }
    return new Set();
  });

  const [isChecking, setIsChecking] = useState(true);

  // One-time migration: check WebLLM cache and populate localStorage
  useEffect(() => {
    async function migrateCache() {
      const migrated = localStorage.getItem(MIGRATION_DONE_KEY);
      if (migrated === 'true') {
        console.log('[useCachedModels] Migration already done, skipping');
        setIsChecking(false);
        return;
      }

      console.log('[useCachedModels] Running one-time cache migration...');
      try {
        const [gemmaCached, hermesCached, deepseekCached, llama70bCached] =
          await Promise.all([
            hasModelInCache(WEBLLM_MODELS.gemma.id, prebuiltAppConfig),
            hasModelInCache(WEBLLM_MODELS.hermes.id, prebuiltAppConfig),
            hasModelInCache(WEBLLM_MODELS.deepseek.id, prebuiltAppConfig),
            hasModelInCache(WEBLLM_MODELS.llama70b.id, prebuiltAppConfig),
          ]);

        console.log('[useCachedModels] Migration cache results:', {
          gemma: gemmaCached,
          hermes: hermesCached,
          deepseek: deepseekCached,
          llama70b: llama70bCached
        });

        const models: string[] = [];
        if (gemmaCached) models.push('webllm-gemma');
        if (hermesCached) models.push('webllm-hermes');
        if (deepseekCached) models.push('webllm-deepseek');
        if (llama70bCached) models.push('webllm-llama70b');

        if (models.length > 0) {
          localStorage.setItem(DOWNLOADED_MODELS_KEY, JSON.stringify(models));
          setCachedModels(new Set(models));
          console.log('[useCachedModels] Migrated models to localStorage:', models);
        }

        localStorage.setItem(MIGRATION_DONE_KEY, 'true');
      } catch (error) {
        console.error('[useCachedModels] Migration error:', error);
      } finally {
        setIsChecking(false);
      }
    }

    migrateCache();
  }, []);

  /**
   * Marks a model as downloaded in both React state and localStorage.
   */
  const markDownloaded = useCallback((modelKey: string) => {
    markModelAsDownloaded(modelKey);
    setCachedModels(prev => {
      if (prev.has(modelKey)) return prev;
      return new Set([...prev, modelKey]);
    });
  }, []);

  return { cachedModels, isChecking, markDownloaded };
}

/**
 * Mark a model as downloaded and save to localStorage.
 */
export function markModelAsDownloaded(modelKey: string) {
  try {
    const stored = localStorage.getItem(DOWNLOADED_MODELS_KEY);
    const models = stored ? JSON.parse(stored) : [];
    if (!models.includes(modelKey)) {
      models.push(modelKey);
      localStorage.setItem(DOWNLOADED_MODELS_KEY, JSON.stringify(models));
      console.log('[useCachedModels] Marked as downloaded:', modelKey);
    }
  } catch (error) {
    console.error('[useCachedModels] Error saving to localStorage:', error);
  }
}
