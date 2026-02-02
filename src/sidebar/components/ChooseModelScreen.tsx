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
          <strong className="model-option-name">Llama 3.2 1B</strong>
          <p className="model-option-desc">Lightweight&amp;fast. Quick download (700 MB).</p>
        </div>
        <div className="model-option">
          <span className="model-option-icon">🧠</span>
          <strong className="model-option-name">Qwen 2.5 7B</strong>
          <p className="model-option-desc">Balanced &amp; capable. Great for general tasks.</p>
        </div>
        <div className="model-option">
          <span className="model-option-icon">🔬</span>
          <strong className="model-option-name">DeepSeek-R1</strong>
          <p className="model-option-desc">Deep thinking. Best for complex reasoning.</p>
        </div>
        <div className="model-option model-option-muted">
          <span className="model-option-icon">✨</span>
          <strong className="model-option-name">Gemini Nano</strong>
          <p className="model-option-desc">Embedded in Chrome, but requires manual activation in settings.</p>
        </div>
      </div>

      <p className="choose-model-note">
        Models run 100% locally on your device. First download may take a few minutes.
      </p>
    </div>
  );
}
