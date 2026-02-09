/**
 * Performance tip banner component.
 * Shows suggestion to try faster models after long streaming times.
 */

import React from 'react';

interface PerformanceTipProps {
  onClose: () => void;
  onModelClick: () => void;
}

export function PerformanceTip({ onClose, onModelClick }: PerformanceTipProps) {
  return (
    <div className="performance-tip">
      <span className="performance-tip-icon">💡</span>
      <span className="performance-tip-text">
        This model is taking a while. Try{' '}
        <button className="performance-tip-link" onClick={onModelClick}>
          Llama 1B
        </button>{' '}
        for faster responses (2-3x speedup)!
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
