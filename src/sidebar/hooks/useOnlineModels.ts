/**
 * Loads the online model list from the backend and keeps it cached.
 *
 * Strategy:
 *   - On mount, read cached list from chrome.storage.local (instant render).
 *   - In parallel, refetch /api/models in the background.
 *   - On success, update state + cache.
 *   - On failure, keep cached list; if no cache, fall back to FALLBACK_ONLINE_MODELS.
 *
 * Status reflects whether the live list is reachable, used by the model
 * selector / mode toggle to surface "backend unavailable" UI without ever
 * leaving the user without a list to pick from.
 */

import { useEffect, useState } from 'react';
import {
  BACKEND_MODELS_URL,
  backendHeaders,
} from '../constants/backend-config';
import {
  FALLBACK_ONLINE_MODELS,
  type OnlineModel,
} from '../constants/online-models';

declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

const CACHE_KEY = 'online_models_cache';

export type OnlineModelsStatus = 'loading' | 'live' | 'cached' | 'fallback';

export interface UseOnlineModels {
  models: OnlineModel[];
  status: OnlineModelsStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOnlineModels(): UseOnlineModels {
  const [models, setModels] = useState<OnlineModel[]>(FALLBACK_ONLINE_MODELS);
  const [status, setStatus] = useState<OnlineModelsStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const response = await fetch(BACKEND_MODELS_URL, {
        headers: backendHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      const list: OnlineModel[] = Array.isArray(json?.data) ? json.data : [];
      if (list.length === 0) {
        throw new Error('Empty model list');
      }
      setModels(list);
      setStatus('live');
      setError(null);
      await chrome.storage.local.set({ [CACHE_KEY]: list });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      // Keep whatever was loaded from cache; only fall back if we have nothing.
      setStatus((prev) => (prev === 'loading' ? 'fallback' : 'cached'));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await chrome.storage.local.get(CACHE_KEY);
        const cached = stored[CACHE_KEY];
        if (!cancelled && Array.isArray(cached) && cached.length > 0) {
          setModels(cached as OnlineModel[]);
          setStatus('cached');
        }
      } catch {
        /* ignore — fall through to refresh */
      }
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { models, status, error, refresh };
}
