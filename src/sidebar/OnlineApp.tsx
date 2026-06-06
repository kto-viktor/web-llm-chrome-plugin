/**
 * Online-mode app root.
 *
 * Owns:
 *   - the online model list (cached + live from /api/models)
 *   - the selected model (persisted in preferences)
 *   - the assistant-ui runtime that streams from the backend
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
import { useOnlineRuntime } from './runtime/online-runtime';
import { useActiveTabSync } from './hooks/useActiveTabSync';
import { useOnlineModels } from './hooks/useOnlineModels';
import { pickInitialOnlineModel } from './constants/online-models';
import {
  OnlineAttachmentProvider,
  useOnlineAttachments,
} from './runtime/online-attachment-context';
import { preferencesManager } from '../services/preferences-manager.js';

export function OnlineApp() {
  const { models, status, error } = useOnlineModels();
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
        <OnlineHeader
          models={models}
          selectedId={selectedId}
          onSelect={handleSelect}
          status={status}
          error={error}
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
      status={status}
      error={error}
      selectedId={selectedId}
      userId={userId}
      onSelect={handleSelect}
    />
  );
}

interface OnlineAppReadyProps {
  models: ReturnType<typeof useOnlineModels>['models'];
  status: ReturnType<typeof useOnlineModels>['status'];
  error: ReturnType<typeof useOnlineModels>['error'];
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
  status,
  error,
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
      <AssistantRuntimeProvider runtime={runtime}>
        <OnlineHeader
          models={models}
          selectedId={selectedId}
          onSelect={onSelect}
          status={status}
          error={error}
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
