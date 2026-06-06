/**
 * React hook exposing the current app mode ('online' | 'offline') and a setter.
 *
 * Wraps the singleton preferencesManager. The mode is hydrated from
 * chrome.storage.local on mount; subscribes for cross-window updates so
 * toggling in one panel reflects in another.
 */

import { useCallback, useEffect, useState } from 'react';
import { preferencesManager } from '../../services/preferences-manager.js';

export type AppMode = 'online' | 'offline';

interface UseAppMode {
  mode: AppMode;
  setMode: (mode: AppMode) => Promise<void>;
  ready: boolean;
}

export function useAppMode(): UseAppMode {
  const [mode, setModeState] = useState<AppMode>(() => preferencesManager.get().appMode);
  const [ready, setReady] = useState<boolean>(preferencesManager.loaded);

  useEffect(() => {
    let cancelled = false;
    preferencesManager.load().then(() => {
      if (cancelled) return;
      setModeState(preferencesManager.get().appMode);
      setReady(true);
    });
    const unsubscribe = preferencesManager.subscribe((prefs) => {
      setModeState(prefs.appMode);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const setMode = useCallback(async (next: AppMode) => {
    await preferencesManager.setMode(next);
  }, []);

  return { mode, setMode, ready };
}
