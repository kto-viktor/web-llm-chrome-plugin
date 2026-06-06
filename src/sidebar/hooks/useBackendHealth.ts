/**
 * Probes whether the online backend is reachable.
 *
 * Used to gate online mode: if the backend can't be reached, the app falls
 * back to offline mode instead of presenting a broken online UI. The user's
 * persisted mode preference is NOT changed — this is a runtime degradation, so
 * the next launch (or a manual retry) tries online again.
 *
 * The probe hits GET /api/models with a short timeout. That endpoint is the
 * cheapest health signal we have and is required for online mode to work at
 * all, so a failure here means online mode can't function regardless.
 */

import { useCallback, useEffect, useState } from 'react';
import { BACKEND_MODELS_URL, backendHeaders } from '../constants/backend-config';

/** How long to wait for the backend before declaring it unreachable. */
const PROBE_TIMEOUT_MS = 4000;

export type BackendHealthStatus = 'checking' | 'online' | 'offline';

export interface UseBackendHealth {
  status: BackendHealthStatus;
  /** Last probe error message, if any. */
  error: string | null;
  /** Re-run the probe (e.g. from a "Retry" button). */
  retry: () => void;
}

export function useBackendHealth(): UseBackendHealth {
  const [status, setStatus] = useState<BackendHealthStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  // Bumped to force a re-probe without changing any other dependency.
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus('checking');
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    (async () => {
      try {
        const response = await fetch(BACKEND_MODELS_URL, {
          headers: backendHeaders(),
          signal: controller.signal,
        });
        if (cancelled) return;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setStatus('online');
        setError(null);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        setStatus('offline');
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  return { status, error, retry };
}
