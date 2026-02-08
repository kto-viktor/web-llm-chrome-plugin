/**
 * Main App component for the sidebar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLLM, usePageAttachment, useCachedModels, useOnboarding } from './hooks';
import { ChatProvider, useChat } from './context/ChatContext';
import { Header } from './components/Header';
import { MessagesContainer } from './components/MessagesContainer';
import { InputArea } from './components/InputArea';

// @ts-ignore - JS module
import { chatService } from '../services/chat-service.js';

/**
 * Inner app component that uses chat context.
 */
function AppContent() {
  const llm = useLLM();
  const { attachment, clear: clearAttachment, reload: reloadAttachment } = usePageAttachment();
  const chat = useChat();
  const { cachedModels } = useCachedModels();
  const { showDropdownTooltip, markModelSelected, dismissDropdownTooltip } = useOnboarding();

  const [previewModel, setPreviewModel] = useState<string | null>(null);
  const [showGeminiSetup, setShowGeminiSetup] = useState(false);
  const [pendingTooltip, setPendingTooltip] = useState(false);

  const isDownloading = llm.status === 'downloading';
  const isReady = llm.status === 'ready';

  // Handle model change from selector
  const handleModelChange = useCallback((modelName: string) => {
    // Dismiss dropdown tooltip on dropdown use (user already knows about it!)
    if (showDropdownTooltip) {
      dismissDropdownTooltip();
    }

    if (isDownloading) {
      // During download, just show preview info
      setPreviewModel(modelName);
      setShowGeminiSetup(modelName === 'gemini-nano');
    } else {
      // Actually switch the model
      setPreviewModel(null);
      llm.switchModel(modelName);
      setShowGeminiSetup(modelName === 'gemini-nano' && !llm.geminiNanoAvailable);
    }
  }, [isDownloading, llm, showDropdownTooltip, dismissDropdownTooltip]);

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
    llm.cancelDownload();
    setPreviewModel(null);
    setShowGeminiSetup(false);
  }, [llm]);

  // Handle model bubble click
  const handleBubbleClick = useCallback((modelName: string) => {
    // Set flag to show tooltip after model loads
    setPendingTooltip(true);
    llm.switchModel(modelName);
  }, [llm]);

  // Show tooltip when model becomes ready after selection
  useEffect(() => {
    if (isReady && pendingTooltip) {
      markModelSelected();
      setPendingTooltip(false);
    }
  }, [isReady, pendingTooltip, markModelSelected]);

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
        showGeminiSetup={shouldShowGeminiSetup}
        showDropdownTooltip={showDropdownTooltip && isReady}
        onDismissDropdownTooltip={dismissDropdownTooltip}
      />

      <MessagesContainer
        messages={chat.messages}
        isDownloading={isDownloading}
        isFromCache={llm.isFromCache}
        modelName={llm.modelName}
        previewModelKey={previewModel}
        isGenerating={chat.isGenerating}
        currentResponse={chat.currentResponse}
        showThinking={true}
        llmStatus={llm.status}
        cachedModels={cachedModels}
        onModelSelect={handleBubbleClick}
      />

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
