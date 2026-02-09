/**
 * Screen displayed when no model is cached and user needs to select one.
 * Shows an arrow pointing to the model selector with model descriptions.
 */

import React from 'react';

interface ChooseModelScreenProps {
  cachedModels?: Set<string>;
  onModelSelect?: (modelKey: string) => void;
}

export function ChooseModelScreen({
  cachedModels = new Set(),
  onModelSelect
}: ChooseModelScreenProps) {
  const getModelClass = (modelKey: string, isRecommended: boolean = false) => {
    const classes = ['model-option'];
    if (cachedModels.has(modelKey)) {
      classes.push('model-option-cached');
    } else if (isRecommended) {
      classes.push('model-option-recommended');
    }
    return classes.join(' ');
  };

  return (
    <div className="choose-model-screen">
      <h2 className="choose-model-title">Choose Your LLM:</h2>

      <div className="model-options">
        <div
          className={getModelClass('webllm-llama')}
          onClick={() => onModelSelect?.('webllm-llama')}
          style={{ cursor: onModelSelect ? 'pointer' : 'default' }}
        >
          <span className="model-option-icon">🦙</span>
          <strong className="model-option-name">Llama 3.2 (1B params)</strong>
          {cachedModels.has('webllm-llama') && (
            <span className="model-option-badge model-option-badge-downloaded">Downloaded</span>
          )}
          <p className="model-option-desc">Lightweight and fast<br/>Size: <b>700 mb</b> to download</p>
        </div>
        <div
          className={getModelClass('webllm-gemma', true)}
          onClick={() => onModelSelect?.('webllm-gemma')}
          style={{ cursor: onModelSelect ? 'pointer' : 'default' }}
        >
          <span className="model-option-icon">💎</span>
          <strong className="model-option-name">Gemma 2 (2B params)</strong>
          {cachedModels.has('webllm-gemma') ? (
            <span className="model-option-badge model-option-badge-downloaded">Downloaded</span>
          ) : (
            <span className="model-option-badge model-option-badge-recommended">Recommended</span>
          )}
          <p className="model-option-desc">Balanced and smart<br/>Size: <b>2.5 Gb</b> to download</p>
        </div>
        <div
          className={getModelClass('webllm-hermes')}
          onClick={() => onModelSelect?.('webllm-hermes')}
          style={{ cursor: onModelSelect ? 'pointer' : 'default' }}
        >
          <span className="model-option-icon">🎯</span>
          <strong className="model-option-name">Hermes 3 (3B params)</strong>
          {cachedModels.has('webllm-hermes') && (
            <span className="model-option-badge model-option-badge-downloaded">Downloaded</span>
          )}
          <p className="model-option-desc">Excellent instruction-following<br/>Size: <b>2.9 Gb</b> to download</p>
        </div>
        <div
          className={getModelClass('webllm-deepseek')}
          onClick={() => onModelSelect?.('webllm-deepseek')}
          style={{ cursor: onModelSelect ? 'pointer' : 'default' }}
        >
          <span className="model-option-icon">🔬</span>
          <strong className="model-option-name">DeepSeek-R1 (8B params)</strong>
          {cachedModels.has('webllm-deepseek') && (
            <span className="model-option-badge model-option-badge-downloaded">Downloaded</span>
          )}
          <p className="model-option-desc">Reasoning, but experimental model<br/>Size: <b>4.5 Gb</b> to download</p>
        </div>
        <div
          className={getModelClass('webllm-llama70b')}
          onClick={() => onModelSelect?.('webllm-llama70b')}
          style={{ cursor: onModelSelect ? 'pointer' : 'default' }}
        >
          <span className="model-option-icon">🦕</span>
          <strong className="model-option-name">Llama 3.1 (70B params)</strong>
          {cachedModels.has('webllm-llama70b') && (
            <span className="model-option-badge model-option-badge-downloaded">Downloaded</span>
          )}
          <p className="model-option-desc">Super heavy. Requires 30Gb GPU - runs on latest Macbooks or gaming PC's.<br/>Size: <b className="model-option-red">32 Gb</b> to download</p>
        </div>
        <div className="model-option model-option-muted">
          <span className="model-option-icon">✨</span>
          <strong className="model-option-name">Gemini Nano</strong>
          <p className="model-option-desc">Embedded in Chrome, but requires manual activation in settings.</p>
        </div>
      </div>

      <p className="choose-model-note">
        Models run 100% locally on your device. The first download may take a few minutes.
      </p>
    </div>
  );
}
