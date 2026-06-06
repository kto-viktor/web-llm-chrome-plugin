/**
 * Holds the page(s) attached for the current online chat and owns the
 * extract → upload → register pipeline so every entry point (the manual 📎
 * button and the automatic on-open attach) shares one in-flight guard and
 * busy state.
 *
 * Lives between OnlineApp (consumes file ids to feed the runtime config) and
 * AssistantThread (where the attach button + chip live). Cleared on new
 * thread / mode switch / unmount.
 *
 * Each attachment is the result of:
 *   Readability extract on the active tab
 *     → POST /api/v1/files/  → file id
 *     → keep both the id (for backend RAG) and a tiny preview (for UI chip).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
// @ts-ignore — JS module, no types
import { extractActivePage } from '../../services/page-extractor-online.js';
import { uploadTextAsFile } from '../../services/online-file-upload';
import { analytics } from '../../services/analytics';

export interface OnlineAttachment {
  id: string;
  filename: string;
  title: string;
  url: string;
}

/** Outcome of an attach attempt; `error` is set only on a real failure. */
export interface AttachResult {
  ok: boolean;
  /** Why it failed — e.g. browser-internal page, no content, backend down. */
  error?: string;
  /** True when another attach was already in flight and this call was a no-op. */
  skipped?: boolean;
}

interface OnlineAttachmentContextValue {
  attachments: OnlineAttachment[];
  /** True while an extract/upload is running. */
  busy: boolean;
  add: (a: OnlineAttachment) => void;
  remove: (id: string) => void;
  clear: () => void;
  /**
   * Extract the active tab, upload it, and register the resulting file id.
   * Appends to the existing attachments (used by the manual 📎 button).
   */
  attachActivePage: () => Promise<AttachResult>;
  /**
   * Like attachActivePage but replaces the current attachment set with just
   * the active page — used to keep the attachment in sync with the tab the
   * user is looking at. No-op if the active page is already the only one
   * attached.
   */
  syncActivePage: () => Promise<AttachResult>;
}

const Context = createContext<OnlineAttachmentContextValue | null>(null);

export function OnlineAttachmentProvider({ children }: { children: React.ReactNode }) {
  const [attachments, setAttachments] = useState<OnlineAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  // Ref guard prevents overlapping attaches (e.g. auto-attach racing a click)
  // without depending on the async `busy` state.
  const inFlight = useRef(false);
  // Latest attachments, so attachActivePage can dedupe by URL without being
  // recreated on every attachments change (keeps the auto-attach effect stable).
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const add = useCallback((a: OnlineAttachment) => {
    setAttachments((prev) => {
      const filtered = prev.filter((p) => p.id !== a.id);
      return [...filtered, a];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = useCallback(() => setAttachments([]), []);

  /**
   * Shared extract → upload → register pipeline. `mode` decides whether the
   * new page is appended to the current set or replaces it. Dedupes against
   * the page already attached so re-runs (tab re-activation, manual re-click)
   * don't re-upload the same URL.
   */
  const attachActivePageImpl = useCallback(
    async (mode: 'append' | 'replace'): Promise<AttachResult> => {
      if (inFlight.current) return { ok: false, skipped: true };
      inFlight.current = true;
      setBusy(true);
      try {
        const page = await extractActivePage();
        const current = attachmentsRef.current;

        if (mode === 'append') {
          if (current.some((a) => a.url === page.url)) return { ok: true };
        } else {
          // replace: no-op if the active page is already the only attachment.
          if (current.length === 1 && current[0].url === page.url) {
            return { ok: true };
          }
        }

        const filename = sanitizeFilename(page.title) + '.txt';
        const body =
          `Title: ${page.title}\n` +
          `URL: ${page.url}\n` +
          (page.byline ? `By: ${page.byline}\n` : '') +
          `\n${page.content}\n`;
        const uploaded = await uploadTextAsFile(body, filename);
        const attachment: OnlineAttachment = {
          id: uploaded.id,
          filename: uploaded.filename,
          title: page.title,
          url: page.url,
        };

        if (mode === 'replace') {
          setAttachments([attachment]);
        } else {
          add(attachment);
        }
        analytics.pageAttached();
        return { ok: true };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        return { ok: false, error };
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [add],
  );

  const attachActivePage = useCallback(
    () => attachActivePageImpl('append'),
    [attachActivePageImpl],
  );
  const syncActivePage = useCallback(
    () => attachActivePageImpl('replace'),
    [attachActivePageImpl],
  );

  const value = useMemo(
    () => ({ attachments, busy, add, remove, clear, attachActivePage, syncActivePage }),
    [attachments, busy, add, remove, clear, attachActivePage, syncActivePage],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOnlineAttachments(): OnlineAttachmentContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error('useOnlineAttachments must be used inside OnlineAttachmentProvider');
  }
  return ctx;
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'page';
}
