/**
 * Holds the page(s) the user has attached for the current online chat.
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
  useState,
} from 'react';

export interface OnlineAttachment {
  id: string;
  filename: string;
  title: string;
  url: string;
}

interface OnlineAttachmentContextValue {
  attachments: OnlineAttachment[];
  add: (a: OnlineAttachment) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const Context = createContext<OnlineAttachmentContextValue | null>(null);

export function OnlineAttachmentProvider({ children }: { children: React.ReactNode }) {
  const [attachments, setAttachments] = useState<OnlineAttachment[]>([]);

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

  const value = useMemo(
    () => ({ attachments, add, remove, clear }),
    [attachments, add, remove, clear],
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
