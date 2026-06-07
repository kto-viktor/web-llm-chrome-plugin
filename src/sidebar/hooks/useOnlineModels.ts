/**
 * Loads the online model list from the backend on every mount.
 *
 * Deliberately NOT cached: the list is fetched fresh each time (and with
 * `cache: 'no-store'`) so changing the backend's model catalog is reflected
 * immediately on reload.
 *
 * There is NO fallback list. If the backend is unreachable the status becomes
 * 'error' and the caller (OnlineRoute) drops the whole app into offline mode —
 * online mode is only entered when a live list is available.
 */

import { useEffect, useState } from 'react';
import {
  BACKEND_MODELS_URL,
  backendHeaders,
} from '../constants/backend-config';
import type { OnlineModel } from '../constants/online-models';

export type OnlineModelsStatus = 'loading' | 'live' | 'error';

export interface UseOnlineModels {
  models: OnlineModel[];
  status: OnlineModelsStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOnlineModels(): UseOnlineModels {
  const [models, setModels] = useState<OnlineModel[]>([]);
  const [status, setStatus] = useState<OnlineModelsStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const response = await fetch(BACKEND_MODELS_URL, {
        headers: backendHeaders(),
        cache: 'no-store',
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
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setModels([]);
      setStatus('error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { models, status, error, refresh };
}
