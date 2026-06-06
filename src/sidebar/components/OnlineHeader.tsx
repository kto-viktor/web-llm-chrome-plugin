/**
 * Header for online mode: model dropdown + status line.
 *
 * Reuses the same outer DOM structure as the offline Header so existing CSS
 * (.header, .header-row, .title, .model-status) styles it identically.
 *
 * Mode toggle slot is a left-of-children placeholder so ModeToggle (next
 * task) can drop in without further changes here.
 */

import React from 'react';
import { NewChatButton } from './NewChatButton';
import type { OnlineModel } from '../constants/online-models';
import type { OnlineModelsStatus } from '../hooks/useOnlineModels';

interface OnlineHeaderProps {
  models: OnlineModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  status: OnlineModelsStatus;
  error: string | null;
  toggleSlot?: React.ReactNode;
  /** Side-effect to run after the new-chat button switches threads. */
  onNewChat?: () => void;
  /**
   * Whether to render the new-chat button. It calls useAssistantRuntime(), so
   * it must only mount inside an AssistantRuntimeProvider. The pre-runtime
   * loading header passes false.
   */
  showNewChat?: boolean;
}

export function OnlineHeader({
  models,
  selectedId,
  onSelect,
  status,
  error,
  toggleSlot,
  onNewChat,
  showNewChat = true,
}: OnlineHeaderProps) {
  const selected = models.find((m) => m.id === selectedId) ?? null;

  return (
    <header className="header">
      <div className="header-row">
        <h1 className="title">AI Assistant</h1>
        <div className="header-actions">
          {toggleSlot}
          {showNewChat && <NewChatButton onAfter={onNewChat} />}
          <select
            className="online-model-selector"
            value={selectedId ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            aria-label="Select model"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.featured ? '★ ' : ''}
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="model-status">
        <span className="status-text">
          {selected?.description ?? selected?.name ?? 'Loading models…'}
        </span>
        {status === 'fallback' && (
          <span className="status-warn" title={error ?? ''}>
            (offline list)
          </span>
        )}
        {status === 'cached' && error && (
          <span className="status-warn" title={error}>
            (cached)
          </span>
        )}
      </div>
    </header>
  );
}
