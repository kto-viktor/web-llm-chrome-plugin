/**
 * Language tip banner component.
 * Suggests switching to a multilingual model when non-Latin input is detected on Llama 1B.
 */

import React from 'react';

interface LanguageTipProps {
  onClose: () => void;
}

export function LanguageTip({ onClose }: LanguageTipProps) {
  return (
    <div className="performance-tip">
      <span className="performance-tip-icon">🌐</span>
      <span className="performance-tip-text">
        I'm a lightweight model, so could you please speak English with me? 🙂 Or you can try another model - they're multilingual.
      </span>
      <button
        className="performance-tip-close"
        onClick={onClose}
        aria-label="Close tip"
      >
        ×
      </button>
    </div>
  );
}