/**
 * Scrollable container for chat messages.
 * Handles different states: loading, download, empty, messages.
 */

import React, { useRef, useEffect } from 'react';
import type { Message as MessageType } from '../types';
import { Message } from './Message';
import { EmptyState } from './EmptyState';
import { DownloadScreen } from './DownloadScreen';
import { CacheLoadingScreen } from './CacheLoadingScreen';
import { ChooseModelScreen } from './ChooseModelScreen';
import { ThinkingIndicator } from './ThinkingIndicator';

interface MessagesContainerProps {
  messages: MessageType[];
  isDownloading: boolean;
  isFromCache: boolean;
  modelName: string | null;
  previewModelKey: string | null;
  isGenerating: boolean;
  currentResponse: string;
  showThinking: boolean;
  llmStatus: string;
  cachedModels?: Set<string>;
}

export function MessagesContainer({
  messages,
  isDownloading,
  isFromCache,
  modelName,
  previewModelKey,
  isGenerating,
  currentResponse,
  showThinking,
  llmStatus,
  cachedModels,
}: MessagesContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, currentResponse, isGenerating]);

  const renderContent = () => {
    // Show choose model screen when awaiting user selection
    if (llmStatus === 'awaiting-selection') {
      return <ChooseModelScreen cachedModels={cachedModels} />;
    }

    // Show loading screen during download
    if (isDownloading) {
      const displayModelKey = previewModelKey || modelName || 'webllm-hermes';
      if (isFromCache) {
        return <CacheLoadingScreen />;
      }
      return <DownloadScreen modelKey={displayModelKey} />;
    }

    // Show empty state if no messages
    if (messages.length === 0 && !isGenerating) {
      return <EmptyState />;
    }

    // Render messages
    return (
      <>
        {messages.map((msg, index) => (
          <Message key={index} message={msg} />
        ))}

        {/* Show streaming message if generating */}
        {isGenerating && currentResponse && (
          <Message
            message={{ role: 'assistant', content: '' }}
            isGenerating={true}
            streamingContent={currentResponse}
          />
        )}
      </>
    );
  };

  return (
    <div className="messages-container" id="messages-container" ref={containerRef}>
      <div className="messages" id="messages">
        {renderContent()}
      </div>
      <ThinkingIndicator visible={showThinking && isGenerating && !currentResponse} />
    </div>
  );
}
