/**
 * Keeps the online attachment in sync with the tab the user is looking at.
 *
 * While enabled it:
 *   - syncs once on mount (attach the currently active page), and
 *   - re-syncs whenever the active tab changes or the active tab finishes
 *     navigating to a new page.
 *
 * The actual extract/upload/replace is delegated to `sync` (the context's
 * syncActivePage), which dedupes by URL so rapid tab switching or reloads of
 * the same page don't re-upload. Events are debounced so a burst (e.g. several
 * onUpdated events during load) collapses into one sync.
 *
 * Failures are swallowed: on a browser-internal page (chrome://, the New Tab
 * page, etc.) there's simply nothing to attach.
 */

import { useEffect, useRef } from 'react';

declare const chrome: {
  tabs: {
    query(query: {
      active: boolean;
      currentWindow: boolean;
    }): Promise<Array<{ id?: number; windowId?: number }>>;
    onActivated: {
      addListener(cb: (info: { tabId: number; windowId: number }) => void): void;
      removeListener(cb: (info: { tabId: number; windowId: number }) => void): void;
    };
    onUpdated: {
      addListener(
        cb: (
          tabId: number,
          changeInfo: { status?: string },
          tab: { active?: boolean },
        ) => void,
      ): void;
      removeListener(
        cb: (
          tabId: number,
          changeInfo: { status?: string },
          tab: { active?: boolean },
        ) => void,
      ): void;
    };
  };
};

const DEBOUNCE_MS = 400;

type SyncFn = () => Promise<unknown>;

export function useActiveTabSync(sync: SyncFn, enabled: boolean): void {
  // Hold the latest sync fn in a ref so listeners stay stable and we never
  // re-bind chrome events just because the callback identity changed.
  const syncRef = useRef(sync);
  syncRef.current = sync;

  useEffect(() => {
    if (!enabled) return;
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void syncRef.current();
      }, DEBOUNCE_MS);
    };

    const onActivated = () => schedule();
    const onUpdated = (
      _tabId: number,
      changeInfo: { status?: string },
      tab: { active?: boolean },
    ) => {
      // Only react when the *active* tab has finished loading a new page.
      if (tab.active && changeInfo.status === 'complete') schedule();
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    // Initial sync for the page that's already open.
    schedule();

    return () => {
      if (timer) clearTimeout(timer);
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [enabled]);
}
