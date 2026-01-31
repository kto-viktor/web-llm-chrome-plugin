/**
 * Input area with textarea, quick actions, and send button.
 */

import React, { useState, useCallback, KeyboardEvent } from 'react';
import { useAutoResize } from '../hooks';
import { AttachmentChip } from './AttachmentChip';
import type { PageAttachment } from '../types';

interface InputAreaProps {
  attachment: PageAttachment | null;
  onRemoveAttachment: () => void;
  onSend: (message: string) => void;
  onSummary: () => void;
  onClear: () => void;
  disabled: boolean;
}

export function InputArea({
  attachment,
  onRemoveAttachment,
  onSend,
  onSummary,
  onClear,
  disabled,
}: InputAreaProps) {
  const [message, setMessage] = useState('');
  const { textareaRef, handleInput, reset } = useAutoResize();

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setMessage('');
    reset();
  }, [message, disabled, onSend, reset]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleInput();
  }, [handleInput]);

  return (
    <>
      <AttachmentChip attachment={attachment} onRemove={onRemoveAttachment} />

      <div className="input-area">
        <div className="quick-actions">
          <button
            className="action-btn"
            onClick={onSummary}
            disabled={disabled}
            title="Get page summary"
          >
            Page Summary
          </button>
          <button
            className="action-btn secondary"
            onClick={onClear}
            disabled={disabled}
            title="Clear chat history"
          >
            Clear
          </button>
        </div>

        <div className="input-row">
          <textarea
            ref={textareaRef}
            className="message-input"
            placeholder="Ask about this page..."
            rows={1}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            title="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>

        <div className="contact-row">
          <a
            href="mailto:kto.viktor.kto@gmail.com"
            className="contact-link"
            title="Contact developer"
          >
            I will be happy to get in touch. - Viktor
          </a>
        </div>
      </div>
    </>
  );
}
