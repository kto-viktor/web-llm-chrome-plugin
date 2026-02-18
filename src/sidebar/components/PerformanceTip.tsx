/**
 * Performance tip banner component.
 * Shows suggestion to try a smaller model after long streaming times.
 */

import React from 'react';

interface PerformanceTipProps {
  onClose: () => void;
}

export function PerformanceTip({ onClose }: PerformanceTipProps) {
  return (
    <div className="performance-tip">
      <span className="performance-tip-icon">💡</span>
      <span className="performance-tip-text">
        This model is taking a while. Try a smaller model for faster responses!
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
