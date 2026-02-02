/**
 * Download progress bar component.
 * Shows during model download.
 */

import React from 'react';
import { MODEL_INFO } from './DownloadScreen';

interface DownloadProgressProps {
  visible: boolean;
  modelName: string | null;
  progress: number;
  text: string;
  isFromCache: boolean;
  onCancel?: () => void;
}

export function DownloadProgress({
  visible,
  modelName,
  progress,
  text,
  isFromCache,
  onCancel,
}: DownloadProgressProps) {
  if (!visible) return null;

  const modelInfo = modelName ? MODEL_INFO[modelName] : null;
  const displayName = modelInfo?.name || 'model';
  const progressText = text || 'Downloading...';

  return (
    <div className="download-section">
      <div className="download-info">
        {displayName}: {progressText}
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(progress * 100).toFixed(1)}%` }}
          />
        </div>
        {onCancel && (
          <button
            className="cancel-download-btn"
            onClick={onCancel}
            title="Cancel download"
          >
            ✕
          </button>
        )}
      </div>
      <div className="download-note">
        {isFromCache
          ? "Quickly loading from your device — no more internet needed! :)"
          : "This is a one-time download."}
      </div>
    </div>
  );
}
