/**
 * Screen displayed when no model is cached and user needs to select one.
 * Shows an arrow pointing to the model selector with model descriptions.
 */

import React from 'react';

export function ChooseModelScreen() {
  return (
    <div className="choose-model-screen">
      <div className="choose-model-arrow">↗</div>
      <h2 className="choose-model-title">Choose Your AI Model</h2>
      <p className="choose-model-subtitle">Select a model from the dropdown above to get started.</p>

      <div className="model-options">
        <div className="model-option">
          <span className="model-option-icon">🦙</span>
          <strong className="model-option-name">Llama 3.2 (1B params)</strong>
          <p className="model-option-desc">Lightweight and fast<br/>Size: <b>700 mb</b> to download</p>
        </div>
        <div className="model-option">
          <span className="model-option-icon">💎</span>
          <strong className="model-option-name">Gemma 2 2B</strong>
          <p className="model-option-desc">Compact and capable. Great quality (2.5 GB).</p>
        </div>
        <div className="model-option">
          <span className="model-option-icon">🎯</span>
          <strong className="model-option-name">Hermes 3 3B</strong>
          <p className="model-option-desc">Balanced and smart. Excellent all-rounder (2.9 GB).</p>
        </div>
        <div className="model-option">
          <span className="model-option-icon">🔬</span>
          <strong className="model-option-name">DeepSeek-R1</strong>
          <p className="model-option-desc">Deep thinking. Best for complex reasoning (4.5 GB).</p>
        </div>
        <div className="model-option">
          <span className="model-option-icon">🦕</span>
          <strong className="model-option-name">Llama 3.1 70B</strong>
          <p className="model-option-desc">Most powerful. Requires high-end GPU (31 GB).</p>
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
