/**
 * Headless chat UI built from assistant-ui primitives.
 *
 * One component, two runtimes: an AssistantRuntimeProvider above this tree
 * decides whether messages are streamed from the online backend or the local
 * LLM. The thread doesn't care.
 *
 * Reuses existing CSS class names from sidebar.css so the new chat looks
 * identical to the old one (`.message`, `.message.user`, `.message.assistant`,
 * `.input-area`, `.message-input`, etc).
 */

import React from 'react';
import {
  ThreadPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
  ComposerPrimitive,
  useMessagePartText,
} from '@assistant-ui/react';
import { formatResponse } from '../utils/formatResponse';

interface AssistantThreadProps {
  emptyState?: React.ReactNode;
  /**
   * Optional slot rendered above the composer (e.g. attachment chips). Stays
   * mounted across messages until the parent decides to remove it.
   */
  aboveComposer?: React.ReactNode;
  /**
   * Optional slot rendered inline with the composer controls (e.g. attach
   * page button).
   */
  composerExtras?: React.ReactNode;
}

export function AssistantThread({ emptyState, aboveComposer, composerExtras }: AssistantThreadProps) {
  return (
    <ThreadPrimitive.Root className="thread-root">
      <ThreadPrimitive.Viewport className="messages-container">
        <ThreadPrimitive.Empty>
          {emptyState ?? <DefaultEmpty />}
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>
      {aboveComposer}
      <ThreadComposer extras={composerExtras} />
    </ThreadPrimitive.Root>
  );
}

function DefaultEmpty() {
  return (
    <div className="empty-state">
      <p>Ask me anything.</p>
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="message user">
      <div className="message-content">
        <MessagePrimitive.Parts components={{ Text: UserText }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="message assistant">
      <div className="message-content">
        {/* While the assistant message has no parts yet we're waiting for the
            first token — show the animated thinking dots. They vanish as soon
            as content streams in (hasContent becomes true). */}
        <MessagePrimitive.If hasContent={false}>
          <ThinkingDots />
        </MessagePrimitive.If>
        <MessagePrimitive.Parts components={{ Text: AssistantText }} />
      </div>
    </MessagePrimitive.Root>
  );
}

/** Animated "waiting for response" dots, reusing the offline indicator styles. */
function ThinkingDots() {
  return (
    <div className="thinking-indicator" aria-label="Waiting for response">
      <div className="thinking-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

/** User text is plain — no markdown — matching the old Message.tsx behavior. */
function UserText() {
  return <MessagePartPrimitive.Text />;
}

/**
 * Assistant text rendered as markdown. We pull the raw streaming string via
 * useMessagePartText and feed it through the existing formatResponse() so
 * callouts / code-blocks / lists render identically to the legacy UI.
 */
function AssistantText() {
  const part = useMessagePartText();
  const text = part.type === 'text' ? part.text : '';
  return (
    <span
      className="markdown"
      dangerouslySetInnerHTML={{ __html: formatResponse(text) }}
    />
  );
}

function ThreadComposer({ extras }: { extras?: React.ReactNode }) {
  return (
    <ComposerPrimitive.Root className="input-area">
      <div className="input-row">
        {extras}
        <ComposerPrimitive.Input
          className="message-input"
          placeholder="Message…"
          autoFocus
        />
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel className="composer-button cancel-button" aria-label="Stop">
            ■
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send className="composer-button send-button" aria-label="Send">
            ➤
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
      </div>
    </ComposerPrimitive.Root>
  );
}
