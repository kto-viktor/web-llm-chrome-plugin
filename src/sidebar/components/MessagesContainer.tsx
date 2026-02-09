/**
 * Scrollable container for chat messages.
 * Handles different states: loading, download, empty, messages.
 */

import React from 'react';
import type { Message as MessageType, ViewState } from '../types';
import { Message } from './Message';
import { EmptyState } from './EmptyState';
import { DownloadScreen } from './DownloadScreen';
import { ChooseModelScreen } from './ChooseModelScreen';
import { ThinkingIndicator } from './ThinkingIndicator';
import { useScrollAnchor } from '../hooks/useScrollAnchor';

interface MessagesContainerProps {
  messages: MessageType[];
  viewState: ViewState;
  isGenerating: boolean;
  currentResponse: string;
  cachedModels?: Set<string>;
  onModelSelect?: (modelKey: string) => void;
}

export function MessagesContainer({
  messages,
  viewState,
  isGenerating,
  currentResponse,
  cachedModels,
  onModelSelect,
}: MessagesContainerProps) {
  // Use smart auto-scroll that respects user intent
  const { containerRef } = useScrollAnchor({
    enabled: true,
    threshold: 100,
    dependencies: [messages, currentResponse, isGenerating]
  });

  const renderContent = () => {
    // Show welcome screen
    if (viewState.screen === 'welcome') {
      return (
        <ChooseModelScreen
          cachedModels={cachedModels}
          onModelSelect={onModelSelect}
        />
      );
    }

    // Show download in progress
    if (viewState.screen === 'downloading') {
      return <DownloadScreen modelKey={viewState.modelKey} />;
    }

    // Show chat screen (empty or with messages)
    if (viewState.screen === 'chat') {
      if (messages.length === 0 && !isGenerating) {
        return <EmptyState />;
      }

      return (
        <>
          {messages.map((msg, index) => (
            <Message key={index} message={msg} />
          ))}
          {isGenerating && currentResponse && (
            <Message
              message={{ role: 'assistant', content: '' }}
              isGenerating={true}
              streamingContent={currentResponse}
            />
          )}
        </>
      );
    }

    // Fallback: empty
    return null;
  };

  return (
    <div className="messages-container" id="messages-container" ref={containerRef}>
      <div className="messages" id="messages">
        {renderContent()}
      </div>
      <ThinkingIndicator visible={isGenerating && !currentResponse} />
    </div>
  );
}
