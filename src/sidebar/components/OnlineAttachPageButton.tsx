/**
 * Composer-area button that grabs the active tab's main content (Readability),
 * uploads it to the backend's file API, and registers the returned file id
 * with the online attachment context.
 *
 * On error (e.g. browser-internal page, no main content, backend down) we
 * surface a short inline message via `onError` so the parent can show it
 * without disrupting the chat.
 */

import React, { useCallback, useState } from 'react';
// @ts-ignore — JS module, no types
import { extractActivePage } from '../../services/page-extractor-online.js';
import { uploadTextAsFile } from '../../services/online-file-upload';
import { useOnlineAttachments } from '../runtime/online-attachment-context';
import { analytics } from '../../services/analytics';

interface OnlineAttachPageButtonProps {
  onError?: (message: string) => void;
}

export function OnlineAttachPageButton({ onError }: OnlineAttachPageButtonProps) {
  const { add } = useOnlineAttachments();
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const page = await extractActivePage();
      const filename = sanitizeFilename(page.title) + '.txt';
      const body =
        `Title: ${page.title}\n` +
        `URL: ${page.url}\n` +
        (page.byline ? `By: ${page.byline}\n` : '') +
        `\n${page.content}\n`;
      const uploaded = await uploadTextAsFile(body, filename);
      add({
        id: uploaded.id,
        filename: uploaded.filename,
        title: page.title,
        url: page.url,
      });
      analytics.pageAttached();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[OnlineAttachPage] failed:', msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, add, onError]);

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

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'page';
}
