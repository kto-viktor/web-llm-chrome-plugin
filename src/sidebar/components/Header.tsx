/**
 * Header component with title, model selector, and status.
 */

import React, { useCallback } from 'react';
import { StatusIndicator } from './StatusIndicator';
import { DownloadProgress } from './DownloadProgress';
import { GeminiSetup } from './GeminiSetup';
import type { LLMState } from '../types';

interface HeaderProps {
  llmState: LLMState;
  previewModel: string | null;
  onModelChange: (modelName: string) => void;
  onGeminiDismiss: () => void;
  onCancelDownload: () => void;
  showGeminiSetup: boolean;
  showDropdownTooltip?: boolean;
  onDismissDropdownTooltip?: () => void;
}

export function Header({
  llmState,
  previewModel,
  onModelChange,
  onGeminiDismiss,
  onCancelDownload,
  showGeminiSetup,
  showDropdownTooltip = false,
  onDismissDropdownTooltip,
}: HeaderProps) {
  const { status, displayName, modelName, downloadProgress, downloadText, isFromCache } = llmState;

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onModelChange(e.target.value);
  }, [onModelChange]);

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

  // Determine which value to show in selector
  const selectorValue = previewModel || modelName || '';

  return (
    <>
      <header className="header">
        <div className="header-row">
          <h1 className="title">Local LLM</h1>
          <div style={{ position: 'relative' }}>
            <select
              className="model-selector"
              value={selectorValue}
              onChange={handleModelChange}
            >
              {!modelName && !previewModel && <option value="">Select a model...</option>}
              <option value="webllm-llama">Llama - <b className="green">700 Mb</b> - Lightweight</option>
              <option value="webllm-gemma">Gemma 2 - 2.5 Gb - Balanced</option>
              <option value="webllm-hermes">Hermes 3 - 2.9 Gb - Following instructions</option>
              <option value="webllm-deepseek">DeepSeek-R1 - 4.5 Gb - Reasoning model</option>
              <option value="webllm-llama70b">Llama 3.1 70B - <b>31 GB</b> - Most Powerful</option>
              <option value="gemini-nano">Gemini Nano - Chrome embedded model</option>
            </select>
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
        isFromCache={isFromCache}
        onCancel={onCancelDownload}
      />

      {llmState.error && (
        <div className="error-section">
          <div className="error-message">{llmState.error}</div>
        </div>
      )}

      <GeminiSetup visible={showGeminiSetup} onDismiss={onGeminiDismiss} />
    </>
  );
}
