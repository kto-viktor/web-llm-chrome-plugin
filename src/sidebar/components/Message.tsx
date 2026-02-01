/**
 * Individual chat message component.
 * Renders markdown during streaming for real-time formatted output.
 */

import React from 'react';
import type { Message as MessageType } from '../types';
import { MessageAttachment } from './MessageAttachment';
import { formatResponse } from '../utils/formatResponse';

interface MessageProps {
  message: MessageType;
  isGenerating?: boolean;
  streamingContent?: string;
}

export function Message({ message, isGenerating, streamingContent }: MessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = isGenerating && streamingContent !== undefined;

  // For streaming, show the streaming content
  const displayContent = isStreaming ? streamingContent : message.content;

  const getClassName = () => {
    let className = `message ${message.role}`;
    if (isGenerating) {
      className += ' generating';
    }
    return className;
  };

  // User messages are plain text, assistant messages are markdown
  const renderContent = () => {
    if (isUser) {
      return displayContent;
    }

    // Render markdown for assistant messages (including during streaming)
    return (
      <>
        <span dangerouslySetInnerHTML={{ __html: formatResponse(displayContent) }} />
        {isStreaming && <span className="streaming-cursor">▋</span>}
      </>
    );
  };

  return (
    <div className={getClassName()}>
      {message.attachment && <MessageAttachment attachment={message.attachment} />}
      <div className="message-content">
        {renderContent()}
      </div>
    </div>
  );
}
