/**
 * Main App component for the sidebar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLLM, usePageAttachment, useCachedModels, useOnboarding } from './hooks';
import { markModelAsDownloaded } from './hooks/useCachedModels';
import { ChatProvider, useChat } from './context/ChatContext';
import { Header } from './components/Header';
import { MessagesContainer } from './components/MessagesContainer';
import { InputArea } from './components/InputArea';
import { DownloadConfirmScreen } from './components/DownloadConfirmScreen';

// @ts-ignore - JS module
import { chatService } from '../services/chat-service.js';

/**
 * Inner app component that uses chat context.
 */
function AppContent() {
  const llm = useLLM();
  const { attachment, clear: clearAttachment, reload: reloadAttachment } = usePageAttachment();
  const chat = useChat();
  const { cachedModels, isChecking } = useCachedModels();
  const { showDropdownTooltip, markModelSelected, dismissDropdownTooltip } = useOnboarding();

  const [previewModel, setPreviewModel] = useState<string | null>(null);
  const [showGeminiSetup, setShowGeminiSetup] = useState(false);
  const [pendingTooltip, setPendingTooltip] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<string | null>(null);

  const isDownloading = llm.status === 'downloading';
  const isReady = llm.status === 'ready';

  // Handle model change from selector
  const handleModelChange = useCallback(async (modelName: string) => {
    // Don't allow selection while still checking cache
    if (isChecking) {
      console.log('[App] Still checking cache, please wait...');
      return;
    }

    // Dismiss dropdown tooltip on dropdown use (user already knows about it!)
    if (showDropdownTooltip) {
      dismissDropdownTooltip();
    }

    console.log('[App] Dropdown selected:', modelName, 'Cached models:', Array.from(cachedModels));

    // Check if model is cached
    const isCached = cachedModels.has(modelName) || modelName === 'gemini-nano';
    console.log('[App] Is cached?', isCached);

    if (isCached) {
      // Model cached - load immediately
      // If currently downloading, it will be moved to background automatically
      console.log('[App] Loading cached model immediately');
      setPreviewModel(null);
      try {
        await llm.switchModel(modelName);
      } catch (error: unknown) {
        // Ignore errors from cancelled downloads
        if (error instanceof Error && error.message?.includes('cancelled')) {
          console.log('[App] Ignoring cancelled download error');
        } else {
          console.error('[App] Model switch error:', error);
        }
      }
      setShowGeminiSetup(modelName === 'gemini-nano' && !llm.geminiNanoAvailable);
    } else {
      // Model not cached - show confirmation
      // If currently downloading, it will be moved to background when new download starts
      console.log('[App] Showing download confirmation');
      setPendingDownload(modelName);
    }
  }, [llm, showDropdownTooltip, dismissDropdownTooltip, cachedModels, isChecking]);

  // Handle Gemini setup dismiss
  const handleGeminiDismiss = useCallback(() => {
    setShowGeminiSetup(false);
    if (isDownloading) {
      // Revert to downloading model
      setPreviewModel(null);
    } else {
      // Switch to Hermes
      llm.switchModel('webllm-hermes');
    }
  }, [isDownloading, llm]);

  // Handle send message
  const handleSend = useCallback((message: string) => {
    if (!isReady) return;
    chat.sendMessage(message);
  }, [isReady, chat]);

  // Handle page summary
  const handleSummary = useCallback(() => {
    if (!isReady) return;
    chat.requestPageSummary();
  }, [isReady, chat]);

  // Handle clear history
  const handleClear = useCallback(() => {
    chat.clearHistory();
  }, [chat]);

  // Handle cancel download
  const handleCancelDownload = useCallback(() => {
    console.log('[App] Cancel clicked, status before:', llm.status);
    llm.cancelDownload();
    setPreviewModel(null);
    setShowGeminiSetup(false);
    setPendingDownload(null);
    setPendingTooltip(false);
    // Force check status after a brief delay to see if it updated
    setTimeout(() => {
      console.log('[App] Status after cancel:', llm.status);
    }, 100);
  }, [llm]);

  // Handle cancel background download
  const handleCancelBackgroundDownload = useCallback((modelName: string) => {
    console.log('[App] Cancelling background download:', modelName);
    llm.cancelBackgroundDownload(modelName);
  }, [llm]);

  // Handle model bubble click
  const handleBubbleClick = useCallback(async (modelName: string) => {
    // Don't allow selection while still checking cache
    if (isChecking) {
      console.log('[App] Still checking cache, please wait...');
      return;
    }

    console.log('[App] Model clicked:', modelName, 'Cached models:', Array.from(cachedModels));

    // Check if model is cached
    const isCached = cachedModels.has(modelName) || modelName === 'gemini-nano';
    console.log('[App] Is cached?', isCached);

    if (isCached) {
      // Model cached - load immediately and show tooltip
      console.log('[App] Loading cached model immediately');
      setPendingTooltip(true);
      markModelSelected();
      try {
        await llm.switchModel(modelName);
      } catch (error: unknown) {
        // Ignore errors from cancelled downloads
        if (error instanceof Error && error.message?.includes('cancelled')) {
          console.log('[App] Ignoring cancelled download error');
        } else {
          console.error('[App] Model switch error:', error);
        }
      }
    } else {
      // Model not cached - show confirmation
      console.log('[App] Showing download confirmation');
      setPendingDownload(modelName);
    }
  }, [llm, cachedModels, isChecking, markModelSelected]);

  // Mark model as downloaded when it becomes ready
  useEffect(() => {
    if (isReady && pendingTooltip) {
      setPendingTooltip(false);

      // Mark model as downloaded so we don't show confirmation next time
      if (llm.modelName) {
        markModelAsDownloaded(llm.modelName);
        console.log('[App] Marked model as downloaded:', llm.modelName);
      }
    }
  }, [isReady, pendingTooltip, llm.modelName]);

  // Handle download confirmation
  const handleConfirmDownload = useCallback(async () => {
    if (pendingDownload) {
      setPendingTooltip(true);
      // Show tooltip immediately when download starts
      markModelSelected();
      try {
        await llm.switchModel(pendingDownload);
      } catch (error: unknown) {
        // Ignore errors from cancelled downloads
        if (error instanceof Error && error.message?.includes('cancelled')) {
          console.log('[App] Ignoring cancelled download error');
        } else {
          console.error('[App] Model switch error:', error);
        }
      }
      setPendingDownload(null);
    }
  }, [pendingDownload, llm, markModelSelected]);

  // Handle download cancellation
  const handleCancelDownloadConfirm = useCallback(() => {
    setPendingDownload(null);
  }, []);

  // Clear preview when download completes
  useEffect(() => {
    if (!isDownloading && previewModel) {
      setPreviewModel(null);
    }
  }, [isDownloading, previewModel]);

  // Show gemini setup if status is gemini-unavailable
  useEffect(() => {
    if (llm.status === 'gemini-unavailable') {
      setShowGeminiSetup(true);
    }
  }, [llm.status]);

  // Reload attachment after message is sent
  useEffect(() => {
    if (!chat.isGenerating && chat.messages.length > 0) {
      reloadAttachment();
    }
  }, [chat.isGenerating, chat.messages.length, reloadAttachment]);

  // Determine if showing Gemini setup
  const shouldShowGeminiSetup = showGeminiSetup ||
    (previewModel === 'gemini-nano') ||
    (llm.status === 'gemini-unavailable');

  return (
    <div className="container">
      <Header
        llmState={llm}
        previewModel={previewModel}
        onModelChange={handleModelChange}
        onGeminiDismiss={handleGeminiDismiss}
        onCancelDownload={handleCancelDownload}
        onCancelBackgroundDownload={handleCancelBackgroundDownload}
        showGeminiSetup={shouldShowGeminiSetup}
        showDropdownTooltip={showDropdownTooltip && (isReady || isDownloading)}
        onDismissDropdownTooltip={dismissDropdownTooltip}
      />

      {pendingDownload ? (
        <DownloadConfirmScreen
          modelKey={pendingDownload}
          onConfirm={handleConfirmDownload}
          onCancel={handleCancelDownloadConfirm}
        />
      ) : (
        <MessagesContainer
          messages={chat.messages}
          isDownloading={isDownloading}
          isFromCache={llm.isFromCache ?? false}
          modelName={llm.modelName}
          previewModelKey={previewModel}
          isGenerating={chat.isGenerating}
          currentResponse={chat.currentResponse}
          showThinking={true}
          llmStatus={llm.status}
          cachedModels={cachedModels}
          onModelSelect={handleBubbleClick}
        />
      )}

      <InputArea
        attachment={attachment}
        onRemoveAttachment={clearAttachment}
        onSend={handleSend}
        onSummary={handleSummary}
        onClear={handleClear}
        disabled={!isReady || chat.isGenerating}
      />
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
    <ChatProvider attachment={attachment}>
      <AppContent />
    </ChatProvider>
  );
}
