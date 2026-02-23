/**
 * Main App component for the sidebar.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLLM, usePageAttachment, useCachedModels, useOnboarding, usePerformanceTip, useAttachPageTips } from './hooks';
import { ChatProvider, useChat } from './context/ChatContext';
import { Header } from './components/Header';
import { MessagesContainer } from './components/MessagesContainer';
import { InputArea } from './components/InputArea';
import { DownloadConfirmScreen } from './components/DownloadConfirmScreen';
import { GeminiSetup } from './components/GeminiSetup';
import { PerformanceTip } from './components/PerformanceTip';
import { computeViewState } from './utils/viewState';
import { getModelState } from './utils/modelState';

// @ts-ignore - JS module
import { chatService } from '../services/chat-service.js';
import { analytics } from '../services/analytics';

/**
 * Inner app component that uses chat context.
 */
function AppContent() {
  const llm = useLLM();
  const { attachment, clear: clearAttachment, reload: reloadAttachment } = usePageAttachment();
  const chat = useChat();
  const { cachedModels, isChecking, markDownloaded } = useCachedModels();
  const { showDropdownTooltip, markModelSelected, dismissDropdownTooltip } = useOnboarding();

  const [pendingDownload, setPendingDownload] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Tracks download start times keyed by modelName — used for download analytics
  const downloadTrackingRef = useRef<Map<string, number>>(new Map());

  // Track sidebar opened once on mount
  useEffect(() => {
    analytics.sidebarOpened();
  }, []);

  const { showTip, dismissTip } = usePerformanceTip(chat.isGenerating, selectedModel);
  const { showAttachTip1, showAttachTip2, dismissAttachTip1, dismissAttachTip2 } = useAttachPageTips(attachment, chat.isAttached);

  // Compute view state from selected model
  const modelState = selectedModel
    ? getModelState(selectedModel, llm, cachedModels)
    : null;

  const isReady = modelState?.type === 'ready';
  const viewState = computeViewState(selectedModel, pendingDownload, modelState);

  // Handle model change from selector
  const handleModelChange = useCallback(async (modelName: string) => {
    if (isChecking) return;

    if (showDropdownTooltip) {
      dismissDropdownTooltip();
    }

    // KEY CHANGE: Set selected model FIRST, before any async operations
    setSelectedModel(modelName);

    const modelState = getModelState(modelName, llm, cachedModels);

    if (modelState.type === 'ready') {
      // Already active, nothing to do
      return;
    }

    analytics.modelSelected(modelName);

    if (modelState.type === 'cached') {
      // Load cached model
      await llm.switchModel(modelName);
    } else if (modelState.type === 'not-downloaded') {
      // Show download confirmation
      setPendingDownload(modelName);
    } else if (modelState.type === 'downloading' || modelState.type === 'downloading-background') {
      // Already downloading, just show its progress
      // UI will update via viewState
    } else if (modelState.type === 'gemini-unavailable') {
      // UI will show setup screen
    }
  }, [llm, cachedModels, isChecking, showDropdownTooltip, dismissDropdownTooltip]);

  // Handle Gemini setup dismiss — return to welcome screen
  const handleGeminiDismiss = useCallback(() => {
    setSelectedModel(null);
  }, []);

  // Handle send message
  const handleSend = useCallback((message: string) => {
    if (!isReady) return;
    analytics.messageSent(selectedModel || 'unknown');
    chat.sendMessage(message);
  }, [isReady, chat, selectedModel]);

  // Handle attach page
  const handleAttachPage = useCallback(() => {
    analytics.pageAttached();
    chat.attachPage();
  }, [chat]);

  // Handle detach page
  const handleDetachPage = useCallback(() => {
    chat.detachPage();
  }, [chat]);

  // Handle cancel generation
  const handleCancel = useCallback(() => {
    analytics.generationStopped();
    chat.cancelGeneration();
  }, [chat]);

  // Handle summarize attached page
  const handleSummarizePage = useCallback(() => {
    if (!isReady) return;
    chat.sendMessage('Summarize this page. Use same language as page language to respond.');
  }, [isReady, chat]);

  // Handle clear history
  const handleClear = useCallback(() => {
    analytics.newChat();
    chat.clearHistory();
  }, [chat]);

  // Handle cancel download
  const handleCancelDownload = useCallback(() => {
    if (llm.modelName && downloadTrackingRef.current.has(llm.modelName)) {
      analytics.downloadAbandoned(llm.modelName, Math.round(llm.downloadProgress * 100));
      downloadTrackingRef.current.delete(llm.modelName);
    }
    llm.cancelDownload();
    setPendingDownload(null);
    setSelectedModel(null);  // Back to welcome
  }, [llm]);

  // Handle cancel background download
  const handleCancelBackgroundDownload = useCallback((modelName: string) => {
    console.log('[App] Cancelling background download:', modelName);
    if (downloadTrackingRef.current.has(modelName)) {
      const bgDownload = llm.backgroundDownloads?.find((d: { modelName: string }) => d.modelName === modelName);
      analytics.downloadAbandoned(modelName, Math.round((bgDownload?.progress || 0) * 100));
      downloadTrackingRef.current.delete(modelName);
    }
    llm.cancelBackgroundDownload(modelName);
  }, [llm]);

  // Handle model bubble click
  const handleBubbleClick = useCallback(async (modelName: string) => {
    if (isChecking) return;

    // KEY CHANGE: Set selected model FIRST
    setSelectedModel(modelName);

    const modelState = getModelState(modelName, llm, cachedModels);

    if (modelState.type === 'ready') {
      // Already active
      return;
    }

    analytics.modelSelected(modelName);

    if (modelState.type === 'cached') {
      // Load cached model, show tooltip
      markModelSelected();
      await llm.switchModel(modelName);
    } else if (modelState.type === 'not-downloaded') {
      // Show download confirmation
      setPendingDownload(modelName);
    } else if (modelState.type === 'downloading' || modelState.type === 'downloading-background') {
      // Already downloading, show its progress
    } else if (modelState.type === 'gemini-unavailable') {
      // UI will show setup screen
    }
  }, [llm, cachedModels, isChecking, markModelSelected]);

  // Mark model as downloaded when it becomes ready
  useEffect(() => {
    if (llm.status === 'ready' && llm.modelName) {
      markDownloaded(llm.modelName);
    }
  }, [llm.status, llm.modelName, markDownloaded]);

  // Track download success and failure for confirmed downloads
  useEffect(() => {
    if (llm.status === 'ready' && llm.modelName && downloadTrackingRef.current.has(llm.modelName)) {
      const startTime = downloadTrackingRef.current.get(llm.modelName)!;
      analytics.downloadSuccess(llm.modelName, Date.now() - startTime);
      downloadTrackingRef.current.delete(llm.modelName);
    }
    if (llm.status === 'error' && llm.modelName && downloadTrackingRef.current.has(llm.modelName)) {
      analytics.downloadFailed(llm.modelName, llm.error || 'unknown');
      downloadTrackingRef.current.delete(llm.modelName);
    }
  }, [llm.status, llm.modelName, llm.error]);

  // Mark background-completed models as downloaded
  useEffect(() => {
    if (llm.completedBackgroundModels?.length) {
      llm.completedBackgroundModels.forEach(m => {
        markDownloaded(m);
        if (downloadTrackingRef.current.has(m)) {
          const startTime = downloadTrackingRef.current.get(m)!;
          analytics.downloadSuccess(m, Date.now() - startTime);
          downloadTrackingRef.current.delete(m);
        }
      });
    }
  }, [llm.completedBackgroundModels, markDownloaded]);

  // When a model becomes ready, update selectedModel if appropriate
  useEffect(() => {
    if (llm.status === 'ready' && llm.modelName) {
      // Auto-select if no model selected, or if this is the model we're waiting for
      if (!selectedModel || selectedModel === llm.modelName) {
        setSelectedModel(llm.modelName);
      }
    }
  }, [llm.status, llm.modelName, selectedModel]);

  // Handle download confirmation
  const handleConfirmDownload = useCallback(async () => {
    if (pendingDownload) {
      analytics.downloadStarted(pendingDownload);
      downloadTrackingRef.current.set(pendingDownload, Date.now());
      markModelSelected();
      await llm.switchModel(pendingDownload);
      setPendingDownload(null);
    }
  }, [pendingDownload, llm, markModelSelected]);

  // Handle download cancellation
  const handleCancelDownloadConfirm = useCallback(() => {
    setPendingDownload(null);
    setSelectedModel(null);  // Back to welcome
  }, []);

  // Reload attachment after message is sent
  useEffect(() => {
    if (!chat.isGenerating && chat.messages.length > 0) {
      reloadAttachment();
    }
  }, [chat.isGenerating, chat.messages.length, reloadAttachment]);

  return (
    <div className="container">
      <Header
        llmState={llm}
        viewState={viewState}
        selectedModel={selectedModel}
        cachedModels={cachedModels}
        onModelChange={handleModelChange}
        onCancelDownload={handleCancelDownload}
        onCancelBackgroundDownload={handleCancelBackgroundDownload}
        showDropdownTooltip={showDropdownTooltip && isReady}
        onDismissDropdownTooltip={dismissDropdownTooltip}
      />

      {/* Performance tip (shown after long generation) */}
      {showTip && (
        <PerformanceTip onClose={dismissTip} />
      )}

      {viewState.screen === 'download-confirm' ? (
        <DownloadConfirmScreen
          modelKey={viewState.modelKey}
          onConfirm={handleConfirmDownload}
          onCancel={handleCancelDownloadConfirm}
        />
      ) : viewState.screen === 'gemini-setup' ? (
        <GeminiSetup
          visible={true}
          onDismiss={handleGeminiDismiss}
        />
      ) : (
        <MessagesContainer
          messages={chat.messages}
          viewState={viewState}
          isGenerating={chat.isGenerating}
          currentResponse={chat.currentResponse}
          cachedModels={cachedModels}
          onModelSelect={handleBubbleClick}
        />
      )}

      {viewState.screen !== 'welcome' && viewState.screen !== 'download-confirm' && viewState.screen !== 'gemini-setup' && (
        <InputArea
          attachment={attachment}
          isAttached={chat.isAttached}
          isGenerating={chat.isGenerating}
          onRemoveAttachment={handleDetachPage}
          onSend={handleSend}
          onAttachPage={handleAttachPage}
          onSummarizePage={handleSummarizePage}
          onCancel={handleCancel}
          onClear={handleClear}
          disabled={!isReady || chat.isGenerating}
          showAttachTip1={showAttachTip1}
          showAttachTip2={showAttachTip2}
          onDismissAttachTip1={dismissAttachTip1}
          onDismissAttachTip2={dismissAttachTip2}
        />
      )}
    </div>
  );
}

/**
 * Main App component with providers.
 */
export function App() {
  const { attachment } = usePageAttachment();
  const [initialized, setInitialized] = useState(false);

  // Initialize services on mount
  useEffect(() => {
    const init = async () => {
      console.log('[App] Initializing...');
      await chatService.initialize();
      setInitialized(true);
    };
    init();
  }, []);

  if (!initialized) {
    return (
      <div className="container">
        <div className="cache-loading-screen">
          <div className="cache-loading-text">Initializing...</div>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider attachment={attachment} isAttached={false}>
      <AppContent />
    </ChatProvider>
  );
}
