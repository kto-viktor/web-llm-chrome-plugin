/**
 * Screen shown before downloading an uncached model.
 * Shows model info, download size, and confirmation button.
 */

import React from 'react';

interface ModelInfo {
  name: string;
  icon: string;
  description: string;
  size: string;
  params: string;
}

const MODEL_INFO: Record<string, ModelInfo> = {
  'webllm-qwen3-0.6b': {
    name: 'Qwen3 0.6B',
    icon: '⚡',
    description: 'BEST for simple laptops',
    size: '0.6 GB',
    params: '0.6B parameters'
  },
  'webllm-ministral3b': {
    name: 'Ministral 3B',
    icon: '🎯',
    description: 'Fast, but speaks only english',
    size: '1.8 GB',
    params: '3B parameters'
  },
  'webllm-qwen3-4b': {
    name: 'Qwen3 4B',
    icon: '🧠',
    description: 'Best balance if you have some GPU',
    size: '2 GB',
    params: '4B parameters'
  },
  'webllm-qwen3-8b': {
    name: 'Qwen3 8B',
    icon: '🔥',
    description: 'Strong reasoning',
    size: '4.3 GB',
    params: '8B parameters'
  },
  'webllm-deepseek': {
    name: 'DeepSeek-R1',
    icon: '🔬',
    description: 'Reasoning model',
    size: '4.5 GB',
    params: '8B parameters'
  },
  'webllm-llama70b': {
    name: 'Llama 3.1 70B',
    icon: '🦕',
    description: 'Most powerful model',
    size: '31 GB',
    params: '70B parameters'
  },
  'gemini-nano': {
    name: 'Gemini Nano',
    icon: '✨',
    description: 'Chrome built-in model',
    size: 'Variable',
    params: 'Unknown'
  }
};

interface DownloadConfirmScreenProps {
  modelKey: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DownloadConfirmScreen({ modelKey, onConfirm, onCancel }: DownloadConfirmScreenProps) {
  const info = MODEL_INFO[modelKey] || MODEL_INFO['webllm-ministral3b'];
  const isLargeModel = modelKey === 'webllm-llama70b';

  return (
    <div className="download-confirm-screen">
      <div className="download-confirm-content">
        <div className="download-confirm-icon">{info.icon}</div>
        <h2 className="download-confirm-title">{info.name}</h2>
        <p className="download-confirm-desc">{info.description}</p>

        <div className="download-confirm-details">
          <div className="download-confirm-detail">
            <span className="download-confirm-label">Size:</span>
            <span className={`download-confirm-value ${isLargeModel ? 'download-confirm-warning' : ''}`}>
              {info.size}
            </span>
          </div>
          <div className="download-confirm-detail">
            <span className="download-confirm-label">Parameters:</span>
            <span className="download-confirm-value">{info.params}</span>
          </div>
        </div>

        {isLargeModel && (
          <div className="download-confirm-warning-box">
            ⚠️ This is a very large model. Make sure you have enough storage space and a fast connection.
          </div>
        )}

        <div className="download-confirm-info">
          <p>This model will be downloaded and cached on your device. The download may take a few minutes depending on your connection speed.</p>
          <p>Once downloaded, the model will be available offline.</p>
        </div>

        <div className="download-confirm-actions">
          <button className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="button button-primary" onClick={onConfirm}>
            Download {info.size}
          </button>
        </div>
      </div>
    </div>
  );
}
