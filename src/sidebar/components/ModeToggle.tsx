/**
 * Toggle between online and offline modes.
 *
 * Lives in the header. Tap toggles, fires analytics, and the App's
 * useAppMode subscriber re-routes the tree.
 */

import React from 'react';
import { useAppMode } from '../hooks/useAppMode';
import { analytics } from '../../services/analytics';

export function ModeToggle() {
  const { mode, setMode } = useAppMode();
  const isOnline = mode === 'online';
  const next = isOnline ? 'offline' : 'online';

  const handleClick = async () => {
    analytics.modeChanged(next);
    await setMode(next);
  };

  return (
    <button
      type="button"
      className={`mode-toggle ${isOnline ? 'mode-online' : 'mode-offline'}`}
      onClick={handleClick}
      aria-label={isOnline ? 'Switch to offline mode' : 'Switch to online mode'}
      title={isOnline ? 'Online — switch to offline (private, local)' : 'Offline — switch to online (cloud)'}
    >
      {isOnline ? '🌐 Online' : '💾 Offline'}
    </button>
  );
}
