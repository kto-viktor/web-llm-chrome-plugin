/**
 * BackgroundDownloads component.
 * Shows compact progress bars for downloads happening in the background.
 */

import React from 'react';
import type { BackgroundDownload } from '../types';

interface BackgroundDownloadsProps {
  downloads: BackgroundDownload[];
  onCancel?: (modelName: string) => void;
}

export function BackgroundDownloads({ downloads, onCancel }: BackgroundDownloadsProps) {
  if (downloads.length === 0) return null;

  return (
    <div className="background-downloads-container">
      {downloads.map((download) => (
        <div key={download.modelName} className="background-download-item">
          <div className="background-download-header">
            <span className="background-download-name">
              {download.displayName}
            </span>
            <span className="background-download-progress-text">
              {(download.progress * 100).toFixed(0)}%
            </span>
            {onCancel && (
              <button
                className="background-download-cancel"
                onClick={() => onCancel(download.modelName)}
                title={`Cancel ${download.displayName} download`}
                aria-label="Cancel download"
              >
                ✕
              </button>
            )}
          </div>
          <div className="background-progress-bar">
            <div
              className="background-progress-fill"
              style={{ width: `${(download.progress * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="background-download-status">
            {download.isFromCache === true
              ? 'Loading from cache...'
              : download.isFromCache === false
              ? 'Downloading...'
              : download.text || 'Preparing...'}
          </div>
        </div>
      ))}
    </div>
  );
}
