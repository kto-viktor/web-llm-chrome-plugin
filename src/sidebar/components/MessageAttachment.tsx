/**
 * Inline attachment display within messages.
 */

import React from 'react';
import type { PageAttachment } from '../types';

interface MessageAttachmentProps {
  attachment: PageAttachment;
}

export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  return (
    <div className="message-attachment">
      <span className="message-attachment-icon">📄</span>
      <span className="message-attachment-title">{attachment.title}</span>
    </div>
  );
}
