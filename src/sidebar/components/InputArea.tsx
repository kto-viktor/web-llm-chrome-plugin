/**
 * Input area with textarea, quick actions, and send button.
 */

import React, { useState, useCallback, KeyboardEvent } from 'react';
import { useAutoResize } from '../hooks';
import { AttachmentChip } from './AttachmentChip';
import type { PageAttachment } from '../types';

interface InputAreaProps {
  attachment: PageAttachment | null;
  isAttached: boolean;
  isGenerating: boolean;
  onRemoveAttachment: () => void;
  onSend: (message: string) => void;
  onAttachPage: () => void;
  onCancel: () => void;
  onClear: () => void;
  disabled: boolean;
}

export function InputArea({
  attachment,
  isAttached,
  isGenerating,
  onRemoveAttachment,
  onSend,
  onAttachPage,
  onCancel,
  onClear,
  disabled,
}: InputAreaProps) {
  const [message, setMessage] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);
  const { textareaRef, handleInput, reset } = useAutoResize();

  const handleCopyEmail = useCallback(() => {
    navigator.clipboard.writeText('kto.viktor.kto@gmail.com');
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }, []);

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

  // Helper function to truncate page title
  const getTruncatedTitle = (title: string, maxLength: number = 30): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <>
      {isAttached && attachment && (
        <AttachmentChip attachment={attachment} onRemove={onRemoveAttachment} />
      )}

      <div className="input-area">
        <div className="quick-actions">
          {!isAttached && attachment ? (
            <button
              className="action-btn secondary"
              onClick={onAttachPage}
              disabled={disabled}
              title={`Attach ${attachment.title}`}
            >
              📎 Attach current page
            </button>
          ) : null}
          <button
            className="action-btn clear-history"
            onClick={onClear}
            disabled={disabled}
            title="Clear history"
            style={{ marginLeft: 'auto' }}
          >
            <img
              src={chrome.runtime.getURL('graphics/bin.png')}
              alt="Clear"
              style={{ width: '1.4em', height: '1.4em', marginRight: '0.4em', verticalAlign: 'middle' }}
            />
            Clear history
          </button>
        </div>

        <div className="input-row">
          <textarea
            ref={textareaRef}
            className="message-input"
            placeholder="Type here..."
            rows={1}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          {isGenerating ? (
            <button
              className="send-btn cancel-btn"
              onClick={onCancel}
              title="Stop generating"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1"/>
              </svg>
            </button>
          ) : (
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
          )}
        </div>

        <div className="contact-row">
          <span className="contact-text">I'd be happy to get in touch: </span>
          <span
            className="contact-link"
            title="Click to copy email"
            onClick={handleCopyEmail}
          >
            {emailCopied ? 'Copied!' : 'kto.viktor.kto@gmail.com'}
          </span>
        </div>
      </div>
    </>
  );
}
