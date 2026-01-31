/**
 * Status indicator dot component.
 * Shows colored dot with pulse animation during download.
 */

import React from 'react';

interface StatusIndicatorProps {
  status: string;
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const getClassName = () => {
    const base = 'status-indicator';
    switch (status) {
      case 'ready':
        return `${base} ready`;
      case 'downloading':
        return `${base} downloading`;
      case 'error':
      case 'gemini-unavailable':
        return `${base} error`;
      default:
        return base;
    }
  };

  return <span className={getClassName()} />;
}
