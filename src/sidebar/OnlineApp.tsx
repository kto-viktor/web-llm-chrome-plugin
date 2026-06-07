/**
 * Online-mode app root.
 *
 * Owns:
 *   - the selected model (persisted in preferences)
 *   - the assistant-ui runtime that streams from the backend
 *
 * The model list is provided by OnlineRoute (fetched once, no cache); this
 * component is only mounted when a live list exists.
 *
 * Mounts AssistantThread under an AssistantRuntimeProvider so the chat UI is
 * driven entirely by the runtime; no custom message state lives here.
 *
 * The offline-mode app (App.tsx) is unchanged when this component is not in
 * use — both paths are independent until the offline path is migrated to
 * useLocalRuntime in a later step.
 */

import React, { useEffect, useState } from 'react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { AssistantThread } from './components/AssistantThread';
import { OnlineHeader } from './components/OnlineHeader';
import { ModeToggle } from './components/ModeToggle';
import { OnlineAttachPageButton } from './components/OnlineAttachPageButton';
import { OnlineAttachmentChips } from './components/OnlineAttachmentChips';
import { OnlineModeNotice } from './components/OnlineModeNotice';
import { useOnlineRuntime } from './runtime/online-runtime';
import { useActiveTabSync } from './hooks/useActiveTabSync';
import type { UseOnlineModels } from './hooks/useOnlineModels';
import { pickInitialOnlineModel, type OnlineModel } from './constants/online-models';
import {
  OnlineAttachmentProvider,
  useOnlineAttachments,
} from './runtime/online-attachment-context';
import { preferencesManager } from '../services/preferences-manager.js';

/**
 * Rendered only once a live model list is available (OnlineRoute gates this).
 * The list is passed in rather than fetched here, so there's a single source
 * of truth and no client-side fallback — backend down ⇒ offline mode.
 */
export function OnlineApp({ online }: { online: UseOnlineModels }) {
  const { models } = online;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Hydrate userId + last-selected model from preferences on mount.
  useEffect(() => {
    let cancelled = false;
    preferencesManager.load().then((prefs) => {
      if (cancelled) return;
      setUserId(prefs.userId);
      setSelectedId(prefs.selectedOnlineModel ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Once both list and prefs are in, ensure we have a valid selection.
  useEffect(() => {
    if (models.length === 0) return;
    const valid = selectedId && models.some((m) => m.id === selectedId);
    if (valid) return;
    const initial = pickInitialOnlineModel(models, selectedId);
    if (initial) setSelectedId(initial.id);
  }, [models, selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    preferencesManager.update({ selectedOnlineModel: id });
  };

  // Don't mount the runtime until we have a model id and userId — the runtime
  // closes over both via its config ref.
  if (!selectedId || !userId) {
    return (
      <div className="container">
        <OnlineModeNotice />
        <OnlineHeader
          models={models}
          selectedId={selectedId}
          onSelect={handleSelect}
          toggleSlot={<ModeToggle />}
          showNewChat={false}
        />
        <div className="cache-loading-screen">
          <div className="cache-loading-text">Loading models…</div>
        </div>
      </div>
    );
  }

  return (
    <OnlineAppReady
      models={models}
      selectedId={selectedId}
      userId={userId}
      onSelect={handleSelect}
    />
  );
}

interface OnlineAppReadyProps {
  models: OnlineModel[];
  selectedId: string;
  userId: string;
  onSelect: (id: string) => void;
}

function OnlineAppReady(props: OnlineAppReadyProps) {
  // Provider scopes attached files to one mode instance — switching mode or
  // remounting OnlineAppReady resets attachments.
  return (
    <OnlineAttachmentProvider>
      <OnlineAppReadyInner {...props} />
    </OnlineAttachmentProvider>
  );
}

function OnlineAppReadyInner({
  models,
  selectedId,
  userId,
  onSelect,
}: OnlineAppReadyProps) {
  const {
    attachments,
    clear: clearAttachments,
    syncActivePage,
  } = useOnlineAttachments();
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileIds = React.useMemo(() => attachments.map((a) => a.id), [attachments]);

  const runtime = useOnlineRuntime({ model: selectedId, userId, fileIds });

  // Attach the active page by default and keep it in sync with the tab the
  // user is looking at: syncs on open, on tab switch, and on navigation.
  // Best-effort — browser-internal pages simply leave nothing attached; the
  // 📎 button stays available for an explicit re-attach (and surfaces errors).
  useActiveTabSync(syncActivePage, true);

  // New chat: drop attachments, then re-attach the current page.
  const handleNewChat = React.useCallback(() => {
    clearAttachments();
    void syncActivePage();
  }, [clearAttachments, syncActivePage]);

  // Header lives inside the runtime provider so the new-chat button can
  // access the thread runtime via useAssistantRuntime().
  return (
    <div className="container">
      <OnlineModeNotice />
      <AssistantRuntimeProvider runtime={runtime}>
        <OnlineHeader
          models={models}
          selectedId={selectedId}
          onSelect={onSelect}
          toggleSlot={<ModeToggle />}
          onNewChat={handleNewChat}
        />
        <AssistantThread
          aboveComposer={
            <>
              {attachError && (
                <div className="online-attach-error" role="alert">
                  {attachError}
                  <button
                    type="button"
                    className="online-attach-error-close"
                    onClick={() => setAttachError(null)}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              )}
              <OnlineAttachmentChips />
            </>
          }
          composerExtras={<OnlineAttachPageButton onError={setAttachError} />}
        />
      </AssistantRuntimeProvider>
    </div>
  );
}
