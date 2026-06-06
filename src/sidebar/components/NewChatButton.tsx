/**
 * Button that opens a fresh thread in the active assistant-ui runtime.
 *
 * Must be rendered inside an AssistantRuntimeProvider — useAssistantRuntime
 * grabs the current runtime from React context.
 */

import React from 'react';
import { useAssistantRuntime } from '@assistant-ui/react';
import { analytics } from '../../services/analytics';

interface NewChatButtonProps {
  className?: string;
  /** Optional side-effect after switching threads (e.g. clear attachments). */
  onAfter?: () => void;
}

export function NewChatButton({ className, onAfter }: NewChatButtonProps) {
  const runtime = useAssistantRuntime();

  const handleClick = async () => {
    analytics.newChat();
    await runtime.threads.switchToNewThread();
    onAfter?.();
  };

  return (
    <button
      type="button"
      className={className ?? 'new-chat-button'}
      onClick={handleClick}
      aria-label="New chat"
      title="New chat"
    >
      ＋
    </button>
  );
}
