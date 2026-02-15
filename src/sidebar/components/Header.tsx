/**
 * Header component with title, model selector, and status.
 */

import React from 'react';
import { StatusIndicator } from './StatusIndicator';
import { DownloadProgress } from './DownloadProgress';
import { BackgroundDownloads } from './BackgroundDownloads';
import { ModelSelector } from './ModelSelector';
import type { LLMState } from '../types';

interface HeaderProps {
  llmState: LLMState;
  selectedModel: string | null;
  cachedModels: Set<string>;
  onModelChange: (modelName: string) => void;
  onCancelDownload: () => void;
  onCancelBackgroundDownload: (modelName: string) => void;
  showDropdownTooltip?: boolean;
  onDismissDropdownTooltip?: () => void;
}

export function Header({
  llmState,
  selectedModel,
  cachedModels,
  onModelChange,
  onCancelDownload,
  onCancelBackgroundDownload,
  showDropdownTooltip = false,
  onDismissDropdownTooltip,
}: HeaderProps) {
  const { status, displayName, modelName, downloadProgress, downloadText, backgroundDownloads } = llmState;

  const getStatusText = () => {
    switch (status) {
      case 'detecting':
        return 'Detecting available models...';
      case 'downloading':
        return displayName || 'Downloading model...';
      case 'ready':
        return displayName || 'Ready';
      case 'error':
        return 'Error';
      case 'gemini-unavailable':
        return 'Gemini Nano unavailable';
      case 'awaiting-selection':
        return 'Choose a model to start';
      default:
        return 'Initializing...';
    }
  };

  // Active model is the one currently loaded and ready
  const activeModel = status === 'ready' ? modelName : null;

  return (
    <>
      <header className="header">
        <div className="header-row">
          <h1 className="title">Local LLM</h1>
          <div style={{ position: 'relative' }}>
            <ModelSelector
              selectedModel={selectedModel}
              activeModel={activeModel}
              cachedModels={cachedModels}
              onModelChange={onModelChange}
            />
            {showDropdownTooltip && (
              <div className="dropdown-tooltip">
                <span className="dropdown-tooltip-arrow">↑</span>
                <span className="dropdown-tooltip-text">You can always choose models here</span>
                <button
                  className="dropdown-tooltip-close"
                  onClick={onDismissDropdownTooltip}
                  aria-label="Close tooltip"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="model-status">
          <StatusIndicator status={status} />
          <span className="status-text">{getStatusText()}</span>
        </div>
      </header>

      <DownloadProgress
        visible={status === 'downloading'}
        modelName={modelName}
        progress={downloadProgress}
        text={downloadText}
        isFromCache={modelName ? cachedModels.has(modelName) : false}
        onCancel={onCancelDownload}
      />

      {llmState.error && (
        <div className="error-section">
          <div className="error-message">{llmState.error}</div>
        </div>
      )}

      <BackgroundDownloads
        downloads={backgroundDownloads}
        cachedModels={cachedModels}
        onCancel={onCancelBackgroundDownload}
      />
    </>
  );
}
