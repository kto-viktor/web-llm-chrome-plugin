/**
 * Empty state shown when there are no messages.
 */

import React from 'react';

export function EmptyState() {
  return (
    <div className="empty-state">
      <span className="empty-icon">💬</span>
      <span className="empty-text"> Open page & ask questions about it here</span>
    </div>
  );
}
