/**
 * Composer-area button that (re)attaches the active tab's main content.
 *
 * The actual extract → upload → register pipeline lives in the online
 * attachment context so this button and the automatic on-open attach share
 * one in-flight guard and busy state. Here we just trigger it and, on a real
 * failure, surface a short inline message via `onError`.
 */

import React, { useCallback } from 'react';
import { useOnlineAttachments } from '../runtime/online-attachment-context';

interface OnlineAttachPageButtonProps {
  onError?: (message: string) => void;
}

export function OnlineAttachPageButton({ onError }: OnlineAttachPageButtonProps) {
  const { attachActivePage, busy } = useOnlineAttachments();

  const handleClick = useCallback(async () => {
    const result = await attachActivePage();
    if (!result.ok && result.error) {
      console.warn('[OnlineAttachPage] failed:', result.error);
      onError?.(result.error);
    }
  }, [attachActivePage, onError]);

  return (
    <button
      type="button"
      className="online-attach-button"
      onClick={handleClick}
      disabled={busy}
      title="Attach this page"
      aria-label="Attach this page"
    >
      {busy ? '⏳' : '📎'}
    </button>
  );
}
