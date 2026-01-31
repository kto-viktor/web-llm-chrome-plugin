/**
 * Thinking indicator with animated dots.
 * Shown while waiting for AI response.
 */

import React from 'react';

interface ThinkingIndicatorProps {
  visible: boolean;
}

export function ThinkingIndicator({ visible }: ThinkingIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="thinking-indicator">
      <div className="thinking-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="thinking-text">Thinking</span>
    </div>
  );
}
