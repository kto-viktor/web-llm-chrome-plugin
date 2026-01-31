/**
 * Attachment chip showing current page context.
 */

import React from 'react';
import type { PageAttachment } from '../types';

interface AttachmentChipProps {
  attachment: PageAttachment | null;
  onRemove: () => void;
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  if (!attachment) return null;

  return (
    <div className="attachment-section">
      <div className="attachment-chip">
        <span className="attachment-icon">📄</span>
        <span className="attachment-title">{attachment.title}</span>
        <button
          className="attachment-remove"
          onClick={onRemove}
          title="Remove attachment"
        >
          ×
        </button>
      </div>
    </div>
  );
}
