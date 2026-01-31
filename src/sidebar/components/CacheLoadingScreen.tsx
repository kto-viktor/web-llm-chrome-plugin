/**
 * Cache loading screen shown when model is loading from disk.
 * Compact UI for quick loading.
 */

import React from 'react';

export function CacheLoadingScreen() {
  return (
    <div className="cache-loading-screen">
      <div className="cache-loading-icon">💾</div>
      <div className="cache-loading-text">Loading from your device...</div>
      <div className="cache-loading-subtext">The LLM is yours now.</div>
    </div>
  );
}
