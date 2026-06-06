/**
 * Renders the currently-attached pages as removable chips above the composer.
 * Reads state from the online attachment context.
 */

import React from 'react';
import { useOnlineAttachments } from '../runtime/online-attachment-context';

export function OnlineAttachmentChips() {
  const { attachments, remove } = useOnlineAttachments();
  if (attachments.length === 0) return null;

  return (
    <div className="online-attachment-chips">
      {attachments.map((a) => (
        <span key={a.id} className="online-attachment-chip" title={a.url}>
          <span className="online-attachment-chip-icon">📄</span>
          <span className="online-attachment-chip-title">{a.title}</span>
          <button
            type="button"
            className="online-attachment-chip-remove"
            onClick={() => remove(a.id)}
            aria-label={`Remove ${a.title}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
